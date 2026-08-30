import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

export async function POST(request: Request) {
  const body = await request.json();
  const { espacio_id, fecha, estudiantes_presentes, beneficiarios_presentes, observaciones } = body;

  if (!espacio_id || !fecha) {
    return NextResponse.json({ error: 'espacio_id y fecha son requeridos' }, { status: 400 });
  }
  if (!Array.isArray(estudiantes_presentes) || estudiantes_presentes.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un estudiante presente' }, { status: 400 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [bitacora] } = await client.query(
      `INSERT INTO bitacora_asistencia (espacio_id, fecha, observaciones) VALUES ($1, $2, $3) RETURNING id`,
      [espacio_id, fecha, observaciones ?? null]
    );

    for (const estudianteId of estudiantes_presentes as string[]) {
      await client.query(
        `INSERT INTO bitacora_estudiantes (bitacora_id, estudiante_id) VALUES ($1, $2)`,
        [bitacora.id, estudianteId]
      );
    }

    for (const beneficiarioId of (beneficiarios_presentes ?? []) as string[]) {
      await client.query(
        `INSERT INTO bitacora_beneficiarios (bitacora_id, beneficiario_id) VALUES ($1, $2)`,
        [bitacora.id, beneficiarioId]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ id: bitacora.id }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('bitacora insert error:', err);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
