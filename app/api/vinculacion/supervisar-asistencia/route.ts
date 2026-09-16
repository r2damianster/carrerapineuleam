import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

// Solo profesor/admin de vinculación supervisan — el estudiante-instructor
// nunca ve esta pantalla, solo registra (ver /vinculacion/asistencia).
function puedeSupervisar(usuario: { rol: string; modulos_acceso: string[] }) {
  return ['profesor', 'admin'].includes(usuario.rol) && usuario.modulos_acceso.includes('vinculacion');
}

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisar(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado'); // pendiente|aprobado|rechazado|todos
    const espacioId = searchParams.get('espacio_id');
    const instructorId = searchParams.get('instructor_id');
    const orden = searchParams.get('orden') || 'fecha';

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    const registros = await sql`
      SELECT
        ae.id, ae.espacio_id, e.nombre AS espacio_nombre,
        ae.fecha, ae.hora_inicio, ae.hora_fin, ae.observaciones,
        ae.foto_url, ae.estado_aprobacion, ae.motivo_rechazo, ae.creado_en,
        ae.registrado_por,
        u.nombres AS registrado_por_nombres, u.apellidos AS registrado_por_apellidos,
        (SELECT COUNT(*)::int FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = ae.id) AS num_beneficiarios,
        (
          SELECT COALESCE(json_agg(json_build_object('id', iu.id, 'nombre', iu.nombres || ' ' || iu.apellidos)), '[]')
          FROM espacio_instructores ei JOIN usuarios iu ON iu.id = ei.usuario_id
          WHERE ei.espacio_id = ae.espacio_id
        ) AS instructores,
        (
          SELECT COALESCE(json_agg(json_build_object('id', au.id, 'nombre', au.nombres || ' ' || au.apellidos, 'tipo', ai.tipo)), '[]')
          FROM asistencia_instructores ai JOIN usuarios au ON au.id = ai.usuario_id
          WHERE ai.asistencia_id = ae.id
        ) AS asistentes_instructor
      FROM asistencia_espacio ae
      JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
      JOIN usuarios u ON u.id = ae.registrado_por
      WHERE e.area = 'vinculacion'
        AND (${estado}::text IS NULL OR ${estado} = 'todos' OR ae.estado_aprobacion = ${estado})
        AND (${espacioId}::text IS NULL OR ae.espacio_id = ${espacioId}::int)
        AND (
          ${instructorId}::text IS NULL
          OR ae.registrado_por = ${instructorId}::int
          OR EXISTS (SELECT 1 FROM espacio_instructores ei WHERE ei.espacio_id = ae.espacio_id AND ei.usuario_id = ${instructorId}::int)
        )
      ORDER BY
        (ae.estado_aprobacion = 'pendiente') DESC,
        CASE WHEN ${orden} = 'beneficiarios' THEN (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = ae.id) END DESC,
        CASE WHEN ${orden} = 'espacio' THEN e.nombre END ASC,
        CASE WHEN ${orden} = 'estudiante' THEN u.nombres END ASC,
        ae.fecha DESC, ae.creado_en DESC
    `;

    // Listas para los filtros: espacios de vinculación + instructores/estudiantes que han registrado o están asignados
    const espacios = await sql`SELECT id, nombre FROM "espacios_enseñanza" WHERE area = 'vinculacion' ORDER BY nombre`;
    const instructores = await sql`
      SELECT DISTINCT u.id, u.nombres, u.apellidos
      FROM usuarios u
      JOIN espacio_instructores ei ON ei.usuario_id = u.id
      JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
      WHERE e.area = 'vinculacion'
      ORDER BY u.nombres
    `;

    return NextResponse.json({ success: true, data: registros, espacios, instructores });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
