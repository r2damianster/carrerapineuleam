import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

// Registro de un beneficiario NUEVO + su Pre-Test MCER en una sola
// transacción — a pedido explícito del usuario: no puede quedar un
// beneficiario registrado sin su evaluación inicial. Mismo patrón
// (Pool + BEGIN/COMMIT) que el pretest público de /api/enlaces/[token]/pretest,
// pero autenticado (el evaluador es el usuario de la sesión, no el creador
// del enlace) y sin el modo "ya_registrado" — asignar un beneficiario que ya
// existe a un espacio nuevo sigue siendo POST /api/espacios/asignar, sin test
// obligatorio, porque esa persona ya tiene su pretest de antes.
export async function POST(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || usuario.rol === 'secretaria') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const {
    espacio_id,
    nombres, apellidos, contacto, email,
    edad, tiene_discapacidad, tipo_discapacidad,
    situacion_ocupacional, rol_laboral, nivel_educativo, carrera, curso,
    respuestas_json, puntaje_obtenido, nivel_asignado, evidencia_url,
  } = body;

  if (!nombres || !apellidos || !espacio_id) {
    return NextResponse.json({ error: 'Faltan campos obligatorios del beneficiario' }, { status: 400 });
  }
  if (!respuestas_json || puntaje_obtenido === undefined || !nivel_asignado) {
    return NextResponse.json({ error: 'Falta el Pre-Test — el registro solo se completa junto con la evaluación' }, { status: 400 });
  }
  if (!(await puedeOperarEspacio(usuario, espacio_id))) {
    return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
      [espacio_id, nuevoUsuario.id]
    );

    await client.query(
      `INSERT INTO evaluaciones_mcer (beneficiario_id, estudiante_evaluador_id, tipo, nota, subnivel_actual, respuestas_json, evidencia_url, fecha_evaluacion)
       VALUES ($1, $2, 'inicial', $3, $4, $5, $6, CURRENT_DATE)`,
      [nuevoUsuario.id, usuario.id, puntaje_obtenido, nivel_asignado, JSON.stringify(respuestas_json), evidencia_url || null]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: nuevoUsuario }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.message?.includes('usuarios_email_key')) {
      return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 400 });
    }
    console.error('Registrar-y-evaluar error:', error);
    return NextResponse.json({ error: 'Error registrando al beneficiario', details: error.message }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
