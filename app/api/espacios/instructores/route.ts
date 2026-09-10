import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacio_id = searchParams.get('espacio_id');
    if (!espacio_id) {
      return NextResponse.json({ success: true, data: [], espacio: null, supervisor: null });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [instructores, espacioRows] = await Promise.all([
      sql`
        SELECT u.id, u.nombres, u.apellidos
        FROM espacio_instructores ei
        JOIN usuarios u ON ei.usuario_id = u.id
        WHERE ei.espacio_id = ${parseInt(espacio_id)}
        ORDER BY u.apellidos
      `,
      sql`
        SELECT e.id, e.nombre, s.nombres AS supervisor_nombres, s.apellidos AS supervisor_apellidos
        FROM espacios_enseñanza e
        LEFT JOIN usuarios s ON s.id = e.profesor_id
        WHERE e.id = ${parseInt(espacio_id)}
      `,
    ]);

    const espacioRow = espacioRows[0] || null;
    return NextResponse.json({
      success: true,
      data: instructores,
      espacio: espacioRow ? { id: espacioRow.id, nombre: espacioRow.nombre } : null,
      supervisor: espacioRow?.supervisor_nombres
        ? { nombres: espacioRow.supervisor_nombres, apellidos: espacioRow.supervisor_apellidos }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol) || !usuario.modulos_acceso.includes('vinculacion')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { espacio_id, estudiantes_ids } = await request.json();
    if (!espacio_id || !estudiantes_ids || estudiantes_ids.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    for (const usuario_id of estudiantes_ids) {
      await sql`
        INSERT INTO espacio_instructores (espacio_id, usuario_id)
        VALUES (${espacio_id}, ${usuario_id})
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({ success: true, message: 'Instructores asignados correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
