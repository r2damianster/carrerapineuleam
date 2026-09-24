import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esSuperAdminOLider } from '@/lib/permisos-supervision';

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const esLider = esSuperAdminOLider(usuario);
    const usuarioIdNum = Number(usuario.id);

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    // 1. Desglose analítico por Pasante / Estudiante Supervisado
    const pasantesAnalitica = await sql`
      SELECT 
        u.id AS pasante_id,
        u.nombres,
        u.apellidos,
        u.email,
        COALESCE(e.nombre, 'Sin Espacio') AS espacio_nombre,
        COALESCE(e.id, 0) AS espacio_id,
        COALESCE(asist.horas_aprobadas, 0)::float AS horas_asistencia,
        COALESCE(asist_pend.sesiones_pendientes, 0)::int AS asistencias_pendientes,
        COALESCE(pod.horas_podcast, 0)::float AS horas_podcast,
        COALESCE(inv.horas_investigacion, 0)::float AS horas_investigacion,
        (COALESCE(asist.horas_aprobadas, 0) + COALESCE(pod.horas_podcast, 0) + COALESCE(inv.horas_investigacion, 0))::float AS horas_totales,
        COALESCE(ben.total_beneficiarios, 0)::int AS beneficiarios_a_cargo,
        COALESCE(tests.pre_count, 0)::int AS pre_tests_count,
        COALESCE(tests.post_count, 0)::int AS post_tests_count,
        COALESCE(enc.promedio_estrellas, 5.0)::float AS promedio_satisfaccion
      FROM usuarios u
      LEFT JOIN espacio_instructores ei ON ei.usuario_id = u.id
      LEFT JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id AND e.area = 'vinculacion'
      LEFT JOIN (
        SELECT 
          usuario_id, 
          COALESCE(SUM(horas), 0)::float AS horas_aprobadas
        FROM horas_asistencia_instructor
        GROUP BY usuario_id
      ) asist ON asist.usuario_id = u.id
      LEFT JOIN (
        SELECT 
          ae.registrado_por, 
          COUNT(*)::int AS sesiones_pendientes
        FROM asistencia_espacio ae
        WHERE ae.estado_aprobacion = 'pendiente'
        GROUP BY ae.registrado_por
      ) asist_pend ON asist_pend.registrado_por = u.id
      LEFT JOIN (
        SELECT 
          usuario_id, 
          COALESCE(SUM(horas_total), 0)::float AS horas_podcast
        FROM horas_podcast_pasante
        WHERE estado_aprobacion = 'aprobado'
        GROUP BY usuario_id
      ) pod ON pod.usuario_id = u.id
      LEFT JOIN (
        SELECT 
          usuario_id, 
          COALESCE(SUM(horas), 0)::float AS horas_investigacion
        FROM actividades_investigacion_pasante
        WHERE estado_aprobacion = 'aprobado'
        GROUP BY usuario_id
      ) inv ON inv.usuario_id = u.id
      LEFT JOIN (
        SELECT 
          ie.espacio_id, 
          COUNT(DISTINCT ie.beneficiario_id)::int AS total_beneficiarios
        FROM inscripciones_espacio ie
        GROUP BY ie.espacio_id
      ) ben ON ben.espacio_id = e.id
      LEFT JOIN (
        SELECT 
          estudiante_evaluador_id,
          COUNT(*) FILTER (WHERE tipo = 'inicial')::int AS pre_count,
          COUNT(*) FILTER (WHERE tipo = 'final')::int AS post_count
        FROM evaluaciones_mcer
        GROUP BY estudiante_evaluador_id
      ) tests ON tests.estudiante_evaluador_id = u.id
      LEFT JOIN (
        SELECT 
          instructor_id, 
          AVG(calificacion)::float AS promedio_estrellas
        FROM encuesta_evaluaciones_instructor
        GROUP BY instructor_id
      ) enc ON enc.instructor_id = u.id
      WHERE u.rol = 'estudiante'
        AND (${esLider}::boolean IS TRUE OR e.profesor_id = ${usuarioIdNum})
      ORDER BY u.apellidos ASC, u.nombres ASC
    `;

    // 2. Matriz de Ganancia MCER (Pre-Test vs Post-Test)
    const mcerImpacto = await sql`
      SELECT 
        COALESCE(e_pre.subnivel_actual, 'Sin Nivel') AS nivel_inicial,
        COALESCE(e_post.subnivel_actual, 'Sin Nivel') AS nivel_final,
        COUNT(*)::int AS total_beneficiarios,
        ROUND(AVG(e_pre.nota)::numeric, 1)::float AS nota_pre_promedio,
        ROUND(AVG(e_post.nota)::numeric, 1)::float AS nota_post_promedio,
        ROUND(AVG(e_post.nota - e_pre.nota)::numeric, 1)::float AS ganancia_promedio
      FROM evaluaciones_mcer e_pre
      JOIN evaluaciones_mcer e_post ON e_pre.beneficiario_id = e_post.beneficiario_id
      WHERE e_pre.tipo = 'inicial' AND e_post.tipo = 'final'
      GROUP BY e_pre.subnivel_actual, e_post.subnivel_actual
    `;

    // 3. Totales globales MCER
    const [mcerGlobal] = await sql`
      SELECT 
        COUNT(DISTINCT beneficiario_id)::int AS total_evaluados,
        COUNT(*) FILTER (WHERE tipo = 'inicial')::int AS total_pre,
        COUNT(*) FILTER (WHERE tipo = 'final')::int AS total_post,
        COALESCE(ROUND(AVG(nota) FILTER (WHERE tipo = 'inicial')::numeric, 1), 0)::float AS prom_pre,
        COALESCE(ROUND(AVG(nota) FILTER (WHERE tipo = 'final')::numeric, 1), 0)::float AS prom_post
      FROM evaluaciones_mcer
    `;

    // 4. Alertas de asistencias urgentes
    const asistenciasUrgentes = await sql`
      SELECT 
        ae.id,
        ae.fecha,
        e.nombre AS espacio_nombre,
        u.nombres AS registrador_nombres,
        u.apellidos AS registrador_apellidos
      FROM asistencia_espacio ae
      JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
      JOIN usuarios u ON u.id = ae.registrado_por
      WHERE ae.estado_aprobacion = 'pendiente'
        AND (${esLider}::boolean IS TRUE OR e.profesor_id = ${usuarioIdNum})
      ORDER BY ae.fecha ASC
      LIMIT 10
    `;

    // 5. Encuestas agregadas
    const [encuestasConsolidado] = await sql`
      SELECT 
        COUNT(*)::int AS total_encuestas,
        COALESCE(ROUND(AVG(nivel_satisfaccion)::numeric, 2), 5.0)::float AS satisfaccion_general,
        COALESCE(ROUND(AVG(aprendizaje)::numeric, 2), 5.0)::float AS percepcion_aprendizaje,
        COALESCE(ROUND(AVG(recursos)::numeric, 2), 5.0)::float AS recomienda_curso
      FROM encuestas_satisfaccion
    `;

    return NextResponse.json({
      success: true,
      esLider,
      pasantesAnalitica,
      mcerImpacto,
      mcerGlobal: mcerGlobal || { total_evaluados: 0, total_pre: 0, total_post: 0, prom_pre: 0, prom_post: 0 },
      asistenciasUrgentes,
      encuestasConsolidado: encuestasConsolidado || { total_encuestas: 0, satisfaccion_general: 5.0, percepcion_aprendizaje: 5.0, recomienda_curso: 5.0 },
      metaHorasLegal: 96
    });
  } catch (error: any) {
    console.error('API Indicadores error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

