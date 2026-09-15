import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { calcularHorasPodcast } from '@/lib/horasPodcast';

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

    // Horas ya confirmadas (Sesión 40): solo existen filas en
    // horas_podcast_pasante para videos ya aprobados — se insertan recién al
    // aprobar (app/api/videos/[id]/route.ts), no al subir.
    const [horasPodcastRow] = await sql`
      SELECT COALESCE(SUM(h.horas_total), 0)::float AS total, COUNT(*)::int AS episodios
      FROM horas_podcast_pasante h
      JOIN videos v ON v.id = h.video_id
      WHERE h.usuario_id = ${usuarioId} AND v.aprobado_sitio = true
    `;

    // Horas pendientes: episodios donde el pasante ya quedó marcado como
    // participante pero el profesor todavía no aprueba el video en
    // /admin/videos — se calculan al vuelo (calcularHorasPodcast) porque
    // todavía no tienen fila en horas_podcast_pasante.
    const videosPendientes = await sql`
      SELECT id, invitados_internos, invitados_externos, audiencia_alcanzada
      FROM videos
      WHERE aprobado_sitio = false AND ${usuarioId} = ANY(participantes_estudiantes)
    `;
    const horasPodcastPendientes = videosPendientes.reduce((total: number, v: any) => {
      const desglose = calcularHorasPodcast({
        invitadosInternosCount: v.invitados_internos?.length || 0,
        invitadosExternosCount: v.invitados_externos?.length || 0,
        audienciaAlcanzada: v.audiencia_alcanzada || 0,
      });
      return total + desglose.horasTotal;
    }, 0);

    const tieneInvestigacion = usuario.modulos_acceso.includes('investigacion');
    const [horasInvestigacionRow] = tieneInvestigacion
      ? await sql`SELECT COALESCE(SUM(horas), 0)::float AS total, COUNT(*)::int AS reportes FROM actividades_investigacion_pasante WHERE usuario_id = ${usuarioId}`
      : [{ total: 0, reportes: 0 }];

    return NextResponse.json({
      espacios,
      beneficiarios: beneficiariosRow.total,
      asistenciasRegistradas: asistenciasRow.total,
      evaluacionesMcer: mcerRow.total,
      encuestasEnTuEspacio: encuestasRow.total,
      difusion: difusionRow,
      horasPodcast: { ...horasPodcastRow, pendientes: horasPodcastPendientes, episodiosPendientes: videosPendientes.length },
      horasInvestigacion: tieneInvestigacion ? horasInvestigacionRow : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
