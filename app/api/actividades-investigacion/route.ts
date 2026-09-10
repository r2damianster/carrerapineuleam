import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

// Reporte de horas/actividades de investigación de un pasante de Vinculación
// que además tiene funciones de investigación (usuarios.modulos_acceso
// incluye 'investigacion'). Sin aprobación del profesor — el pasante
// registra directo, queda guardado para un futuro informe agregado (no
// implementado todavía).

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const usuarioIdParam = searchParams.get('usuario_id');

    const esDocenteVinculacion =
      ['profesor', 'admin'].includes(usuario.rol) && usuario.modulos_acceso.includes('vinculacion');

    if (usuario.rol === 'estudiante') {
      // Un pasante solo ve sus propias actividades.
      const actividades = await sql`
        SELECT a.id, a.fecha, a.descripcion, a.horas, a.espacio_id, e.nombre AS espacio_nombre
        FROM actividades_investigacion_pasante a
        LEFT JOIN espacios_enseñanza e ON e.id = a.espacio_id
        WHERE a.usuario_id = ${usuario.id}
        ORDER BY a.fecha DESC, a.id DESC
      `;
      return NextResponse.json({ success: true, data: actividades });
    }

    if (!esDocenteVinculacion) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Profesor/admin de vinculación: todas, o filtradas por un pasante.
    const actividades = usuarioIdParam
      ? await sql`
          SELECT a.id, a.usuario_id, u.nombres, u.apellidos, a.fecha, a.descripcion, a.horas, a.espacio_id, e.nombre AS espacio_nombre
          FROM actividades_investigacion_pasante a
          JOIN usuarios u ON u.id = a.usuario_id
          LEFT JOIN espacios_enseñanza e ON e.id = a.espacio_id
          WHERE a.usuario_id = ${parseInt(usuarioIdParam)}
          ORDER BY a.fecha DESC, a.id DESC
        `
      : await sql`
          SELECT a.id, a.usuario_id, u.nombres, u.apellidos, a.fecha, a.descripcion, a.horas, a.espacio_id, e.nombre AS espacio_nombre
          FROM actividades_investigacion_pasante a
          JOIN usuarios u ON u.id = a.usuario_id
          LEFT JOIN espacios_enseñanza e ON e.id = a.espacio_id
          ORDER BY a.fecha DESC, a.id DESC
        `;

    return NextResponse.json({ success: true, data: actividades });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol !== 'estudiante' || !usuario.modulos_acceso.includes('investigacion')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { fecha, descripcion, horas, espacio_id } = await request.json();
    const horasNum = Number(horas);
    if (!fecha || !descripcion || !horasNum || horasNum <= 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (fecha, descripción, horas)' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Si viene espacio_id, confirmar que sea uno de investigación/vinculación
    // donde este pasante realmente está asignado como instructor — no se
    // confía en un id suelto del cliente.
    let espacioIdValido: number | null = null;
    if (espacio_id) {
      const rows = await sql`
        SELECT 1 FROM espacio_instructores WHERE espacio_id = ${espacio_id} AND usuario_id = ${usuario.id}
      `;
      if (rows.length > 0) espacioIdValido = espacio_id;
    }

    const [creada] = await sql`
      INSERT INTO actividades_investigacion_pasante (usuario_id, espacio_id, fecha, descripcion, horas)
      VALUES (${usuario.id}, ${espacioIdValido}, ${fecha}, ${descripcion}, ${horasNum})
      RETURNING id, fecha, descripcion, horas, espacio_id
    `;

    return NextResponse.json({ success: true, data: creada }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
