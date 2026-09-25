import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeAdministrarArea, puedeGestionarVinculacion, esLiderVinculacion } from '@/lib/modulos';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');

    const sql = neon(process.env.DATABASE_URL!);

    // Estudiante: solo ve los espacios donde es instructor.
    // Profesor/admin: espacios de vinculación solo los propios (profesor_id = él); el líder de
    // Vinculación y el superadmin ven todos. Los de otras áreas (investigación) no cambian.
    const veTodoVinculacion = esLiderVinculacion(usuario);
    const profesorId = Number(usuario.id);
    const espacios = usuario.rol === 'estudiante'
      ? await sql`
          SELECT e.*, c.nombre as ciclo_nombre,
                 (SELECT COUNT(*) FROM inscripciones_espacio ie WHERE ie.espacio_id = e.id) as inscritos,
                 (SELECT COUNT(*) FROM espacio_instructores ei2 WHERE ei2.espacio_id = e.id) as instructores
          FROM espacios_enseñanza e
          JOIN espacio_instructores ei ON ei.espacio_id = e.id AND ei.usuario_id = ${usuario.id}
          LEFT JOIN ciclos_academicos c ON e.ciclo_id = c.id
          WHERE (${area}::text IS NULL OR e.area = ${area})
          ORDER BY e.id DESC
        `
      : await sql`
          SELECT e.*, c.nombre as ciclo_nombre,
                 (SELECT COUNT(*) FROM inscripciones_espacio ie WHERE ie.espacio_id = e.id) as inscritos,
                 (SELECT COUNT(*) FROM espacio_instructores ei2 WHERE ei2.espacio_id = e.id) as instructores
          FROM espacios_enseñanza e
          LEFT JOIN ciclos_academicos c ON e.ciclo_id = c.id
          WHERE (${area}::text IS NULL OR e.area = ${area})
            AND (e.area <> 'vinculacion' OR ${veTodoVinculacion}::boolean IS TRUE OR e.profesor_id = ${profesorId})
          ORDER BY e.id DESC
        `;

    return NextResponse.json({ success: true, data: espacios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombre, tipo, ciclo_id, area } = await request.json();
    if (!nombre || !tipo || !ciclo_id || !area) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!puedeAdministrarArea(usuario, area)) {
      return NextResponse.json({ error: 'No tienes acceso a ese módulo' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO espacios_enseñanza (nombre, tipo, ciclo_id, profesor_id, area)
      VALUES (${nombre}, ${tipo}, ${ciclo_id}, ${usuario.id}, ${area})
    `;
    return NextResponse.json({ success: true, message: 'Espacio creado exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
