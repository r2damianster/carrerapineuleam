import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const estudiantes = await sql`
      SELECT u.id, u.nombres, u.apellidos,
             COALESCE(
               json_agg(
                 json_build_object('id', e.id, 'nombre', e.nombre)
               ) FILTER (WHERE e.id IS NOT NULL),
               '[]'
             ) AS espacios
      FROM usuarios u
      LEFT JOIN espacio_instructores ei ON ei.usuario_id = u.id
      LEFT JOIN espacios_enseñanza e ON e.id = ei.espacio_id AND e.area = 'vinculacion'
      WHERE u.rol = 'estudiante'
      GROUP BY u.id, u.nombres, u.apellidos
      ORDER BY u.nombres ASC
    `;

    return NextResponse.json({ success: true, data: estudiantes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
