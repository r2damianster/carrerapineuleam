import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const esRating = (v: any) => Number.isInteger(v) && v >= 1 && v <= 5;

// Público (sin sesión) — un beneficiario escanea el QR de pretest y toma el
// test/encuesta en el mismo envío. Dos modos:
// - ya_registrado=false (default): se autoinscribe con datos nuevos — crea
//   usuario + perfil + inscripción + evaluación, igual que hace
//   /api/beneficiarios + /api/tests o /api/encuestas para el flujo con
//   sesión, pero atribuyendo la evaluación al instructor que generó el
//   enlace (no hay nadie logueado que la esté aplicando).
// - ya_registrado=true: la persona ya es beneficiario de otro espacio/ciclo
//   — se busca por email y se reusa su usuario_id (solo se inscribe en este
//   espacio si no lo estaba), en vez de fallar por email duplicado o crear
//   un registro repetido de la misma persona.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const body = await request.json();
  const {
    ya_registrado,
    nombres, apellidos, contacto, email,
    edad, tiene_discapacidad, tipo_discapacidad,
    situacion_ocupacional, rol_laboral, nivel_educativo, carrera, curso,
    respuestas_json, puntaje_obtenido, nivel_asignado,
    nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios,
    calificaciones_instructores,
  } = body;

  if (ya_registrado) {
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Escribe el correo con el que te registraste' }, { status: 400 });
    }
  } else if (!nombres || !apellidos) {
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
    let idsInstructores: number[] = [];
    if (enlace.test_tipo === 'encuesta') {
      if (![nivel_satisfaccion, aprendizaje, mejora, recursos].every(esRating)) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Todas las calificaciones deben estar entre 1 y 5' }, { status: 400 });
      }
      const { rows: instructoresRows } = await client.query(
        `SELECT usuario_id FROM espacio_instructores WHERE espacio_id = $1`,
        [enlace.espacio_id]
      );
      idsInstructores = instructoresRows.map((r: any) => r.usuario_id);
      const calificaciones = calificaciones_instructores || {};
      if (idsInstructores.some(id => !esRating(calificaciones[id]))) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Falta calificar a algún instructor del espacio' }, { status: 400 });
      }
    }

    let beneficiarioId: number;
    let beneficiarioNombre: { nombres: string; apellidos: string };

    if (ya_registrado) {
      const { rows: existente } = await client.query(
        `SELECT id, nombres, apellidos FROM usuarios WHERE email = $1 AND rol = 'beneficiario'`,
        [email.trim().toLowerCase()]
      );
      if (existente.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'No encontramos ese correo. Si eres nuevo, usa la opción "Soy nuevo".' }, { status: 404 });
      }
      beneficiarioId = existente[0].id;
      beneficiarioNombre = existente[0];
      await client.query(
        `INSERT INTO inscripciones_espacio (espacio_id, beneficiario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [enlace.espacio_id, beneficiarioId]
      );
    } else {
      const emailFinal = email && email.trim()
        ? email.trim().toLowerCase()
        : `beneficiario+${Date.now()}-${randomBytes(3).toString('hex')}@sin-email.pine`;
      const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

      const { rows: [nuevoUsuario] } = await client.query(
        `INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso)
         VALUES ($1, $2, $3, $4, 'beneficiario', '{}') RETURNING id, nombres, apellidos`,
        [nombres, apellidos, emailFinal, passwordHash]
      );
      beneficiarioId = nuevoUsuario.id;
      beneficiarioNombre = nuevoUsuario;

      await client.query(
        `INSERT INTO perfiles_beneficiarios (
           usuario_id, contacto, edad, tiene_discapacidad, tipo_discapacidad,
           situacion_ocupacional, rol_laboral, nivel_educativo, carrera, curso
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          beneficiarioId, contacto || null, edad || null, !!tiene_discapacidad, tipo_discapacidad || null,
          situacion_ocupacional || null, rol_laboral || null, nivel_educativo || null, carrera || null, curso || null,
        ]
      );

      await client.query(
        `INSERT INTO inscripciones_espacio (espacio_id, beneficiario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [enlace.espacio_id, beneficiarioId]
      );
    }

    if (enlace.test_tipo === 'mcer') {
      await client.query(
        `INSERT INTO evaluaciones_mcer (beneficiario_id, estudiante_evaluador_id, tipo, nota, subnivel_actual, respuestas_json, fecha_evaluacion)
         VALUES ($1, $2, 'inicial', $3, $4, $5, CURRENT_DATE)`,
        [beneficiarioId, enlace.creado_por, puntaje_obtenido, nivel_asignado, JSON.stringify(respuestas_json)]
      );
    } else {
      const { rows: [encuesta] } = await client.query(
        `INSERT INTO encuestas_satisfaccion (beneficiario_id, ciclo_id, nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [beneficiarioId, enlace.ciclo_id, nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios || null]
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
    return NextResponse.json({ success: true, data: beneficiarioNombre }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.message?.includes('usuarios_email_key')) {
      return NextResponse.json({ error: 'Ese email ya está registrado. Si ya eres beneficiario, usa la opción "Ya estoy registrado".' }, { status: 400 });
    }
    console.error('Pretest público error:', error);
    return NextResponse.json({ error: 'Error registrando el pretest', details: error.message }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
