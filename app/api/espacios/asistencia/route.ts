import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacio_id = searchParams.get('espacio_id');
    if (!espacio_id) {
      return NextResponse.json({ success: true, data: [] });
    }
    if (!(await puedeOperarEspacio(usuario, parseInt(espacio_id)))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const registros = await sql`
      SELECT id, fecha, observaciones, creado_en
      FROM asistencia_espacio
      WHERE espacio_id = ${parseInt(espacio_id)}
      ORDER BY fecha DESC
    `;
    return NextResponse.json({ success: true, data: registros });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { espacio_id, fecha, beneficiarios_presentes, observaciones, hora_inicio, hora_fin, foto_url, foto_public_id } = await request.json();

    if (!espacio_id || !fecha) {
      return NextResponse.json({ error: 'espacio_id y fecha son requeridos' }, { status: 400 });
    }
    if (!Array.isArray(beneficiarios_presentes) || beneficiarios_presentes.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un beneficiario presente' }, { status: 400 });
    }
    if (!hora_inicio || !hora_fin) {
      return NextResponse.json({ error: 'Hora de inicio y de fin son requeridas' }, { status: 400 });
    }
    if (hora_fin <= hora_inicio) {
      return NextResponse.json({ error: 'La hora de fin debe ser posterior a la hora de inicio' }, { status: 400 });
    }
    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    // Ventana de 48h: no se puede registrar asistencia de un día futuro ni de más de 2 días atrás
    // (fecha solo guarda el día, sin hora — se usa el día calendario de Ecuador, UTC-5)
    const hoyEcuador = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fechaClub = new Date(`${fecha}T00:00:00Z`);
    const fechaLimite = new Date(`${hoyEcuador}T00:00:00Z`);
    const diffDias = Math.floor((fechaLimite.getTime() - fechaClub.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDias < 0) {
      return NextResponse.json({ error: 'No puedes registrar asistencia de una fecha futura' }, { status: 400 });
    }
    if (diffDias > 2) {
      return NextResponse.json({ error: 'Solo puedes registrar asistencia hasta 48 horas después del día del club' }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [asistencia] } = await client.query(
        `INSERT INTO asistencia_espacio (espacio_id, fecha, observaciones, registrado_por, hora_inicio, hora_fin, foto_url, foto_public_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [espacio_id, fecha, observaciones ?? null, usuario.id, hora_inicio, hora_fin, foto_url ?? null, foto_public_id ?? null]
      );

      for (const beneficiarioId of beneficiarios_presentes as number[]) {
        await client.query(
          `INSERT INTO asistencia_beneficiarios (asistencia_id, beneficiario_id) VALUES ($1, $2)`,
          [asistencia.id, beneficiarioId]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, id: asistencia.id }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: any) {
    console.error('Asistencia insert error:', error);
    return NextResponse.json({ error: 'Error al guardar', details: error.message }, { status: 500 });
  }
}
