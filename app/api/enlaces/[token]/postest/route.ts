import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

const esRating = (v: any) => Number.isInteger(v) && v >= 1 && v <= 5;

// Público (sin sesión) — el beneficiario ya existe (ligado al token desde
// que el instructor lo generó), solo envía las respuestas del postest.
// Token de un solo uso: SELECT ... FOR UPDATE evita que se use dos veces
// por una doble carrera de submits simultáneos.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const body = await request.json();
  const {
    respuestas_json, puntaje_obtenido, nivel_asignado,
    nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios,
    calificaciones_instructores,
  } = body;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: enlaceRows } = await client.query(
      `SELECT tipo, test_tipo, beneficiario_id, ciclo_id, creado_por, expira_en, max_usos, usos_actuales
       FROM enlaces_evaluacion WHERE token = $1 FOR UPDATE`,
      [params.token]
    );
    if (enlaceRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    const enlace = enlaceRows[0];
    const expirado = new Date(enlace.expira_en).getTime() <= Date.now();
    const agotado = enlace.max_usos !== null && enlace.usos_actuales >= enlace.max_usos;
    if (enlace.tipo !== 'postest' || expirado || agotado) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este enlace ya no está disponible' }, { status: 410 });
    }

    if (enlace.test_tipo === 'mcer' && (!respuestas_json || puntaje_obtenido === undefined || !nivel_asignado)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Faltan respuestas del test' }, { status: 400 });
    }
    let idsInstructores: number[] = [];
    if (enlace.test_tipo === 'encuesta') {
      if (![nivel_satisfaccion, aprendizaje, mejora, recursos].every(esRating)) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Todas las calificaciones deben estar entre 1 y 5' }, { status: 400 });
      }
      const { rows: instructoresRows } = await client.query(
        `SELECT usuario_id FROM espacio_instructores WHERE espacio_id = (SELECT espacio_id FROM enlaces_evaluacion WHERE token = $1)`,
        [params.token]
      );
      idsInstructores = instructoresRows.map((r: any) => r.usuario_id);
      const calificaciones = calificaciones_instructores || {};
      if (idsInstructores.some(id => !esRating(calificaciones[id]))) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Falta calificar a algún instructor del espacio' }, { status: 400 });
      }
    }

    if (enlace.test_tipo === 'mcer') {
      await client.query(
        `INSERT INTO evaluaciones_mcer (beneficiario_id, estudiante_evaluador_id, tipo, nota, subnivel_actual, respuestas_json, fecha_evaluacion)
         VALUES ($1, $2, 'final', $3, $4, $5, CURRENT_DATE)`,
        [enlace.beneficiario_id, enlace.creado_por, puntaje_obtenido, nivel_asignado, JSON.stringify(respuestas_json)]
      );
    } else {
      const { rows: [encuesta] } = await client.query(
        `INSERT INTO encuestas_satisfaccion (beneficiario_id, ciclo_id, nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [enlace.beneficiario_id, enlace.ciclo_id, nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios || null]
      );
      for (const idInstructor of idsInstructores) {
        await client.query(
          `INSERT INTO encuesta_evaluaciones_instructor (encuesta_id, instructor_id, calificacion) VALUES ($1, $2, $3)`,
          [encuesta.id, idInstructor, calificaciones_instructores[idInstructor]]
        );
      }
    }

    await client.query(`UPDATE enlaces_evaluacion SET usos_actuales = usos_actuales + 1 WHERE token = $1`, [params.token]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Postest público error:', error);
    return NextResponse.json({ error: 'Error registrando el postest', details: error.message }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
