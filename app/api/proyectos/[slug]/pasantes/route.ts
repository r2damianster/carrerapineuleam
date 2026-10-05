import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarProyecto } from '@/lib/permisosProyecto';

// Pasantes que aportan a un proyecto de investigación (usuarios.proyecto_investigacion_id)
// y sus actividades. Solo lectura, para el líder/colíder del proyecto (o administración del sitio).
// El parámetro [slug] es el id del proyecto (proyectos.id), igual que en el resto de /api/proyectos.
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const proyectoId = params.slug;

    if (!(await puedeGestionarProyecto(sql, usuario, proyectoId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const pasantes = await sql`
      SELECT u.id, u.nombres, u.apellidos, u.email
      FROM usuarios u
      WHERE u.rol = 'estudiante' AND u.proyecto_investigacion_id = ${proyectoId}
      ORDER BY u.apellidos, u.nombres
    `;

    // Actividades reportadas a ESTE proyecto (la copia guardada al registrar), no solo las de
    // los pasantes hoy asignados: así el historial se conserva si reasignan a alguien.
    const actividades = await sql`
      SELECT a.id, a.usuario_id, u.nombres, u.apellidos, a.fecha, a.descripcion, a.horas, a.estado_aprobacion
      FROM actividades_investigacion_pasante a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.proyecto_id = ${proyectoId}
      ORDER BY a.fecha DESC, a.id DESC
    `;

    return NextResponse.json({ success: true, pasantes, actividades });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
