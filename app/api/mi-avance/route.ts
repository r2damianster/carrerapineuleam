import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { MAX_HORAS_AUTONOMAS } from '@/lib/horasAutonomas';

// Resumen de avance/cumplimiento de un pasante (rol estudiante) — pensado
// para que vea de un vistazo, aunque todavía no haya registrado nada, en
// cuántos espacios está asignado, cuántos beneficiarios/asistencias/
// evaluaciones/encuestas hay ahí, y sus horas acreditables (podcast +
// investigación). Consumido por /portal/mi-avance (Sesión 40).
export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol !== 'estudiante') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const usuarioId = parseInt(usuario.id, 10);

    const espacios = await sql`
      SELECT e.id, e.nombre, e.area
      FROM espacio_instructores ei
      JOIN espacios_enseñanza e ON e.id = ei.espacio_id
      WHERE ei.usuario_id = ${usuarioId}
      ORDER BY e.nombre
    `;
    const espacioIds = espacios.map((e: any) => e.id);

    const [beneficiariosRow] = espacioIds.length > 0
      ? await sql`SELECT COUNT(DISTINCT beneficiario_id)::int AS total FROM inscripciones_espacio WHERE espacio_id = ANY(${espacioIds})`
      : [{ total: 0 }];

    const [asistenciasRow] = await sql`
      SELECT COUNT(*)::int AS total FROM asistencia_espacio WHERE registrado_por = ${usuarioId}
    `;

    const [mcerRow] = await sql`
      SELECT COUNT(*)::int AS total FROM evaluaciones_mcer WHERE estudiante_evaluador_id = ${usuarioId}
    `;

    const [encuestasRow] = espacioIds.length > 0
      ? await sql`
          SELECT COUNT(*)::int AS total FROM encuestas_satisfaccion enc
          JOIN inscripciones_espacio ie ON ie.beneficiario_id = enc.beneficiario_id
          WHERE ie.espacio_id = ANY(${espacioIds})
        `
      : [{ total: 0 }];

    const [difusionRow] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE aprobado_sitio = true)::int AS aprobadas,
        COUNT(*) FILTER (WHERE aprobado_sitio = false)::int AS pendientes,
        COUNT(*) FILTER (WHERE tipo = 'podcast')::int AS podcasts
      FROM actividades_difusion WHERE registrador_id = ${usuarioId}
    `;

    // Horas de podcast (Sesión 50): una fila por participante desde que se propone el
    // episodio; cuentan solo cuando el supervisor las aprueba (estado_aprobacion).
    const [horasPodcastRow] = await sql`
      SELECT COALESCE(SUM(horas_total) FILTER (WHERE estado_aprobacion = 'aprobado'), 0)::float AS total,
             COUNT(*) FILTER (WHERE estado_aprobacion = 'aprobado')::int AS episodios,
             COALESCE(SUM(horas_total) FILTER (WHERE estado_aprobacion = 'pendiente'), 0)::float AS pendientes,
             COUNT(*) FILTER (WHERE estado_aprobacion = 'pendiente')::int AS episodios_pendientes
      FROM horas_podcast_pasante
      WHERE usuario_id = ${usuarioId}
    `;
    const horasPodcastPendientes = horasPodcastRow.pendientes;
    const videosPendientes = { length: horasPodcastRow.episodios_pendientes };

    const [horasAsistenciaRow] = await sql`
      SELECT COALESCE(SUM(ha.horas), 0)::float AS total, COUNT(*)::int AS sesiones
      FROM horas_asistencia_instructor ha
      WHERE ha.usuario_id = ${usuarioId}
    `;
    const [asistenciasPendientesRow] = espacioIds.length > 0
      ? await sql`
          SELECT COUNT(*)::int AS total FROM asistencia_espacio
          WHERE espacio_id = ANY(${espacioIds}) AND registrado_por = ${usuarioId} AND estado_aprobacion = 'pendiente'
        `
      : [{ total: 0 }];

    // Asistencias rechazadas en los últimos 14 días (misma ventana que el aviso de
    // lib/notificaciones.ts → 'asistencias-rechazadas'): fecha, espacio y motivo.
    const asistenciasRechazadas = await sql`
      SELECT ae.id, ae.fecha, e.nombre AS espacio_nombre, ae.motivo_rechazo
      FROM asistencia_espacio ae
      JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
      WHERE ae.registrado_por = ${usuarioId}
        AND ae.estado_aprobacion = 'rechazado'
        AND COALESCE(ae.fecha_aprobacion, ae.creado_en) >= NOW() - INTERVAL '14 days'
      ORDER BY ae.fecha DESC
    `;

    const tieneInvestigacion = usuario.modulos_acceso.includes('investigacion');
    const [horasInvestigacionRow] = tieneInvestigacion
      ? await sql`SELECT COALESCE(SUM(horas), 0)::float AS total, COUNT(*)::int AS reportes FROM actividades_investigacion_pasante WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'aprobado'`
      : [{ total: 0, reportes: 0 }];

    const [horasAutonomasRow] = await sql`
      SELECT
        COALESCE(SUM(horas) FILTER (WHERE estado_aprobacion = 'aprobado'), 0)::float AS total,
        COALESCE(SUM(horas) FILTER (WHERE estado_aprobacion = 'pendiente'), 0)::float AS pendientes
      FROM actividades_autonomas_pasante WHERE usuario_id = ${usuarioId}
    `;

    // Detalle de beneficiarios e impacto pedagógico en el espacio del pasante
    const beneficiariosDetalle = espacioIds.length > 0
      ? await sql`
          SELECT 
            u.id, 
            u.nombres, 
            u.apellidos,
            e_pre.nota AS nota_pre,
            e_pre.subnivel_actual AS subnivel_pre,
            e_post.nota AS nota_post,
            e_post.subnivel_actual AS subnivel_post,
            COALESCE(asist.total_asistencias, 0)::int AS asistencias_presentes,
            COALESCE(tot_ses.total_sesiones, 0)::int AS total_sesiones
          FROM inscripciones_espacio ie
          JOIN usuarios u ON u.id = ie.beneficiario_id
          LEFT JOIN evaluaciones_mcer e_pre ON e_pre.beneficiario_id = u.id AND e_pre.tipo = 'inicial'
          LEFT JOIN evaluaciones_mcer e_post ON e_post.beneficiario_id = u.id AND e_post.tipo = 'final'
          LEFT JOIN (
            SELECT ab.beneficiario_id, COUNT(*)::int AS total_asistencias
            FROM asistencia_beneficiarios ab
            JOIN asistencia_espacio ae ON ae.id = ab.asistencia_espacio_id
            WHERE ae.espacio_id = ANY(${espacioIds})
            GROUP BY ab.beneficiario_id
          ) asist ON asist.beneficiario_id = u.id
          LEFT JOIN (
            SELECT COUNT(*)::int AS total_sesiones
            FROM asistencia_espacio
            WHERE espacio_id = ANY(${espacioIds}) AND estado_aprobacion = 'aprobado'
          ) tot_ses ON true
          WHERE ie.espacio_id = ANY(${espacioIds})
          ORDER BY u.nombres ASC
        `
      : [];

    // Comentarios cualitativos de las encuestas de satisfacción recibidas en el espacio
    const resenas = espacioIds.length > 0
      ? await sql`
          SELECT 
            enc.id,
            enc.comentarios AS comentarios_sugerencias,
            enc.fecha AS fecha_registro,
            enc.nivel_satisfaccion AS satisfaccion_general
          FROM encuestas_satisfaccion enc
          JOIN inscripciones_espacio ie ON ie.beneficiario_id = enc.beneficiario_id
          WHERE ie.espacio_id = ANY(${espacioIds}) AND enc.comentarios IS NOT NULL AND enc.comentarios != ''
          ORDER BY enc.fecha DESC
          LIMIT 5
        `
      : [];

    return NextResponse.json({
      espacios,
      beneficiarios: beneficiariosRow.total,
      asistenciasRegistradas: asistenciasRow.total,
      evaluacionesMcer: mcerRow.total,
      encuestasEnTuEspacio: encuestasRow.total,
      difusion: difusionRow,
      horasPodcast: { total: horasPodcastRow.total, episodios: horasPodcastRow.episodios, pendientes: horasPodcastPendientes, episodiosPendientes: videosPendientes.length },
      horasAsistencia: { ...horasAsistenciaRow, sesionesPendientes: asistenciasPendientesRow.total },
      asistenciasRechazadas,
      horasAutonomas: { ...horasAutonomasRow, maximo: MAX_HORAS_AUTONOMAS },
      horasInvestigacion: tieneInvestigacion ? horasInvestigacionRow : null,
      beneficiariosDetalle,
      resenas,
      metaHoras: 96,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
