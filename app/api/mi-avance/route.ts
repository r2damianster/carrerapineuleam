import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

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

    const [horasPodcastRow] = await sql`
      SELECT COALESCE(SUM(h.horas_total), 0)::float AS total, COUNT(*)::int AS episodios
      FROM horas_podcast_pasante h
      JOIN videos v ON v.id = h.video_id
      WHERE h.usuario_id = ${usuarioId} AND v.aprobado_sitio = true
    `;

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
      horasPodcast: horasPodcastRow,
      horasInvestigacion: tieneInvestigacion ? horasInvestigacionRow : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
