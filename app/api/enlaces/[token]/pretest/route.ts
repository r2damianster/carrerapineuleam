import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Público (sin sesión) — un beneficiario nuevo escanea el QR de pretest,
// se autoinscribe y toma el test/encuesta en el mismo envío. Todo en una
// transacción: usuario + perfil + inscripción + evaluación, igual que hace
// /api/beneficiarios + /api/tests o /api/encuestas para el flujo con sesión,
// pero atribuyendo la evaluación al instructor que generó el enlace
// (no hay nadie logueado que la esté aplicando).
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const body = await request.json();
  const {
    nombres, apellidos, contacto, email,
    edad, tiene_discapacidad, tipo_discapacidad,
    situacion_ocupacional, rol_laboral, nivel_educativo, carrera, curso,
    respuestas_json, puntaje_obtenido, nivel_asignado,
    nivel_satisfaccion, comentarios,
  } = body;

  if (!nombres || !apellidos) {
    return NextResponse.json({ error: 'Faltan nombres/apellidos' }, { status: 400 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: enlaceRows } = await client.query(
      `SELECT tipo, test_tipo, espacio_id, ciclo_id, creado_por, expira_en, max_usos, usos_actuales
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
    if (enlace.tipo !== 'pretest' || expirado || agotado) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este enlace ya no está disponible' }, { status: 410 });
    }

    if (enlace.test_tipo === 'mcer' && (!respuestas_json || puntaje_obtenido === undefined || !nivel_asignado)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Faltan respuestas del test' }, { status: 400 });
    }
    if (enlace.test_tipo === 'encuesta' && !nivel_satisfaccion) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Falta el nivel de satisfacción' }, { status: 400 });
    }

    const emailFinal = email && email.trim()
      ? email.trim().toLowerCase()
      : `beneficiario+${Date.now()}-${randomBytes(3).toString('hex')}@sin-email.pine`;
    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

    const { rows: [nuevoUsuario] } = await client.query(
      `INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso)
       VALUES ($1, $2, $3, $4, 'beneficiario', '{}') RETURNING id, nombres, apellidos`,
      [nombres, apellidos, emailFinal, passwordHash]
    );

    await client.query(
      `INSERT INTO perfiles_beneficiarios (
         usuario_id, contacto, edad, tiene_discapacidad, tipo_discapacidad,
         situacion_ocupacional, rol_laboral, nivel_educativo, carrera, curso
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        nuevoUsuario.id, contacto || null, edad || null, !!tiene_discapacidad, tipo_discapacidad || null,
        situacion_ocupacional || null, rol_laboral || null, nivel_educativo || null, carrera || null, curso || null,
      ]
    );

    await client.query(
      `INSERT INTO inscripciones_espacio (espacio_id, beneficiario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [enlace.espacio_id, nuevoUsuario.id]
    );

    if (enlace.test_tipo === 'mcer') {
      await client.query(
        `INSERT INTO evaluaciones_mcer (beneficiario_id, estudiante_evaluador_id, tipo, nota, subnivel_actual, respuestas_json, fecha_evaluacion)
         VALUES ($1, $2, 'inicial', $3, $4, $5, CURRENT_DATE)`,
        [nuevoUsuario.id, enlace.creado_por, puntaje_obtenido, nivel_asignado, JSON.stringify(respuestas_json)]
      );
    } else {
      await client.query(
        `INSERT INTO encuestas_satisfaccion (beneficiario_id, ciclo_id, nivel_satisfaccion, comentarios)
         VALUES ($1, $2, $3, $4)`,
        [nuevoUsuario.id, enlace.ciclo_id, nivel_satisfaccion, comentarios || null]
      );
    }

    await client.query(`UPDATE enlaces_evaluacion SET usos_actuales = usos_actuales + 1 WHERE token = $1`, [params.token]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: nuevoUsuario }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.message?.includes('usuarios_email_key')) {
      return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 400 });
    }
    console.error('Pretest público error:', error);
    return NextResponse.json({ error: 'Error registrando el pretest', details: error.message }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
