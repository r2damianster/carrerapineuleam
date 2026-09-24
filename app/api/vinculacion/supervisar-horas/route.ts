import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeSupervisarVinculacion } from '@/lib/modulos';
import { esSuperAdminOLider } from '@/lib/permisos-supervision';
import { resolverSupervisorFiltro, listarSupervisores, listarPeriodos } from '@/lib/alcanceSupervision';

// Supervisión de horas de podcast e investigación de pasantes (Sesión 50).
// Alcance: un supervisor solo ve pasantes de SUS espacios (espacios_enseñanza.profesor_id);
// el líder de Vinculación/superadmin filtra por supervisor: todos | yo | id.
export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') === 'investigacion' ? 'investigacion' : 'podcast';
    const estado = searchParams.get('estado'); // pendiente|aprobado|rechazado|todos
    const periodoId = searchParams.get('periodo_id');
    const pasanteId = searchParams.get('pasante_id');
    const supervisorFiltro = resolverSupervisorFiltro(usuario, searchParams.get('supervisor'));
    const esLider = esSuperAdminOLider(usuario);

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    const registros = tipo === 'podcast'
      ? await sql`
          SELECT h.id, h.usuario_id, u.nombres, u.apellidos, v.title AS titulo, v.youtube_url,
                 h.tipo_podcast, h.audiencia_alcanzada, h.horas_total::float AS horas,
                 h.estado_aprobacion, h.motivo_rechazo, h.creado_en, h.creado_en::date AS fecha
          FROM horas_podcast_pasante h
          JOIN usuarios u ON u.id = h.usuario_id
          JOIN videos v ON v.id = h.video_id
          WHERE (${supervisorFiltro}::int IS NULL OR EXISTS (
                  SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
                  WHERE ei.usuario_id = h.usuario_id AND e.area = 'vinculacion' AND e.profesor_id = ${supervisorFiltro}::int))
            AND (${estado}::text IS NULL OR ${estado} = 'todos' OR h.estado_aprobacion = ${estado})
            AND (${pasanteId}::text IS NULL OR h.usuario_id = ${pasanteId}::int)
            AND (${periodoId}::text IS NULL OR h.creado_en::date BETWEEN
                 (SELECT fecha_inicio FROM ciclos_academicos WHERE id = ${periodoId}::int)
                 AND (SELECT fecha_fin FROM ciclos_academicos WHERE id = ${periodoId}::int))
          ORDER BY (h.estado_aprobacion = 'pendiente') DESC, h.creado_en DESC
        `
      : await sql`
          SELECT a.id, a.usuario_id, u.nombres, u.apellidos, a.fecha, a.descripcion, a.horas::float AS horas,
                 e.nombre AS espacio_nombre, a.estado_aprobacion, a.motivo_rechazo, a.creado_en
          FROM actividades_investigacion_pasante a
          JOIN usuarios u ON u.id = a.usuario_id
          LEFT JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
          WHERE (${supervisorFiltro}::int IS NULL OR EXISTS (
                  SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e2 ON e2.id = ei.espacio_id
                  WHERE ei.usuario_id = a.usuario_id AND e2.area = 'vinculacion' AND e2.profesor_id = ${supervisorFiltro}::int))
            AND (${estado}::text IS NULL OR ${estado} = 'todos' OR a.estado_aprobacion = ${estado})
            AND (${pasanteId}::text IS NULL OR a.usuario_id = ${pasanteId}::int)
            AND (${periodoId}::text IS NULL OR a.fecha BETWEEN
                 (SELECT fecha_inicio FROM ciclos_academicos WHERE id = ${periodoId}::int)
                 AND (SELECT fecha_fin FROM ciclos_academicos WHERE id = ${periodoId}::int))
          ORDER BY (a.estado_aprobacion = 'pendiente') DESC, a.fecha DESC, a.id DESC
        `;

    const supervisores = esLider ? await listarSupervisores(sql) : [];
    const periodos = await listarPeriodos(sql);

    return NextResponse.json({ success: true, data: registros, esLider, supervisores, periodos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
