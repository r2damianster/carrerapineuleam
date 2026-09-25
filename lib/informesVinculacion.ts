import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { obtenerTopes, obtenerHorasPorTipo, horasContables } from './topesHoras';

export interface ResolverPeriodoParams {
  tipo: 'lider' | 'supervisor';
  cicloId?: number | null;
  mes?: string | null;
}

export interface PeriodoResuelto {
  desde: string;
  hasta: string;
  etiqueta: string;
}

export function clasificarRangoEdad(edad: number | null): string {
  if (edad === null || edad === undefined) return 'Sin dato';
  if (edad < 18) return '<18';
  if (edad <= 25) return '18-25';
  if (edad <= 35) return '26-35';
  if (edad <= 50) return '36-50';
  return '>50';
}

export async function resolverPeriodo(
  sql: NeonQueryFunction<false, false>,
  params: ResolverPeriodoParams
): Promise<PeriodoResuelto> {
  const { tipo, cicloId, mes } = params;

  if (tipo === 'supervisor' && mes) {
    const añoMes = mes.slice(0, 7);
    const [añoStr, mesStr] = añoMes.split('-');
    const año = parseInt(añoStr, 10);
    const mesNum = parseInt(mesStr, 10);
    const ultimoDia = new Date(año, mesNum, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');

    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return {
      desde: `${añoMes}-01`,
      hasta: `${añoMes}-${pad(ultimoDia)}`,
      etiqueta: `${nombresMeses[mesNum - 1]} ${año}`,
    };
  }

  if (cicloId) {
    const [ciclo] = await sql`
      SELECT id, nombre, to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin
      FROM ciclos_academicos
      WHERE id = ${cicloId}
    `;
    if (ciclo) {
      return {
        desde: String(ciclo.fecha_inicio).slice(0, 10),
        hasta: String(ciclo.fecha_fin).slice(0, 10),
        etiqueta: ciclo.nombre,
      };
    }
  }

  const [cicloActivo] = await sql`
    SELECT id, nombre, to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin
    FROM ciclos_academicos
    ORDER BY fecha_inicio DESC LIMIT 1
  `;
  if (cicloActivo) {
    return {
      desde: String(cicloActivo.fecha_inicio).slice(0, 10),
      hasta: String(cicloActivo.fecha_fin).slice(0, 10),
      etiqueta: cicloActivo.nombre,
    };
  }

  const hoyEcuador = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 7);
  return {
    desde: `${hoyEcuador}-01`,
    hasta: `${hoyEcuador}-28`,
    etiqueta: hoyEcuador,
  };
}

export async function datosInformeSupervisor(
  sql: NeonQueryFunction<false, false>,
  params: { supervisorId: number; mes: string }
) {
  const periodo = await resolverPeriodo(sql, { tipo: 'supervisor', mes: params.mes });

  const [proyecto] = await sql`
    SELECT id, nombre_oficial AS nombre, codigo, unidad_academica, carrera, entidad_beneficiaria, zona,
           codigo_documento_supervisor, revision_documento_supervisor
    FROM proyectos WHERE id = 'vinculacion'
  `;

  const [supervisor] = await sql`
    SELECT id, nombres, apellidos, email FROM usuarios WHERE id = ${params.supervisorId}
  `;

  const espacios = await sql`
    SELECT id, nombre, profesor_id FROM "espacios_enseñanza"
    WHERE area = 'vinculacion' AND profesor_id = ${params.supervisorId}
    ORDER BY nombre ASC
  `;
  const espaciosIds = espacios.map((e: any) => e.id);

  if (espaciosIds.length === 0) {
    return {
      periodo,
      general: {
        proyecto_nombre: proyecto?.nombre || 'Proyecto de Vinculación PINE',
        unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación',
        carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
        codigo_documento: proyecto?.codigo_documento_supervisor || 'PINE-INF-SUP',
        revision_documento: proyecto?.revision_documento_supervisor || '01',
        supervisor_nombre: supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : 'Supervisor',
        supervisor_email: supervisor?.email || '',
        mes: periodo.etiqueta,
        total_pasantes: 0,
        total_beneficiarios: 0,
        total_sesiones: 0,
        zona: proyecto?.zona || 'Distrito 13D02 Manta',
        espacios: [],
      },
      tareas: [],
      no_previstas: [],
      participacion: { pasantes: [], genero: {}, edad: {} },
      fotos: [],
    };
  }

  const [pasantesRes, beneficiariosRes, tareasRes, noPrevistasRes, fotosRes, generoRes, edadRes] = await Promise.all([
    sql`
      SELECT DISTINCT u.id, u.nombres, u.apellidos
      FROM espacio_instructores ei
      JOIN usuarios u ON ei.usuario_id = u.id
      WHERE ei.espacio_id = ANY(${espaciosIds})
      ORDER BY u.apellidos, u.nombres
    `,
    sql`
      SELECT COUNT(DISTINCT ie.beneficiario_id)::int AS total
      FROM inscripciones_espacio ie
      WHERE ie.espacio_id = ANY(${espaciosIds})
    `,
    sql`
      SELECT
        COALESCE(p.actividad, 'Sesiones del Espacio') AS actividad_descripcion,
        e.nombre AS espacio_nombre,
        COUNT(a.id)::int AS sesiones_aprobadas,
        COALESCE(SUM((SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)), 0)::int AS beneficiarios_atendidos,
        ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1)::float AS horas_acreditadas,
        COALESCE(ARRAY_AGG(DISTINCT a.comentario_supervisor) FILTER (WHERE a.comentario_supervisor IS NOT NULL), '{}') AS comentarios
      FROM asistencia_espacio a
      JOIN "espacios_enseñanza" e ON a.espacio_id = e.id
      LEFT JOIN proyecto_actividades_plan p ON a.actividad_plan_id = p.id
      WHERE a.espacio_id = ANY(${espaciosIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.fecha BETWEEN ${periodo.desde}::date AND ${periodo.hasta}::date
        AND a.no_prevista = false
      GROUP BY p.actividad, e.nombre
    `,
    sql`
      SELECT
        e.nombre AS espacio_nombre,
        to_char(a.fecha, 'YYYY-MM-DD') AS fecha,
        (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS beneficiarios_atendidos,
        ROUND(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0::numeric, 1)::float AS horas_acreditadas,
        a.observaciones
      FROM asistencia_espacio a
      JOIN "espacios_enseñanza" e ON a.espacio_id = e.id
      WHERE a.espacio_id = ANY(${espaciosIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.fecha BETWEEN ${periodo.desde}::date AND ${periodo.hasta}::date
        AND a.no_prevista = true
      ORDER BY a.fecha ASC
    `,
    sql`
      SELECT
        a.foto_url AS url,
        to_char(a.fecha, 'YYYY-MM-DD') AS fecha,
        e.nombre AS espacio_nombre,
        (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS num_beneficiarios,
        (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS num_pasantes
      FROM asistencia_espacio a
      JOIN "espacios_enseñanza" e ON a.espacio_id = e.id
      WHERE a.espacio_id = ANY(${espaciosIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.usar_en_informe = true
        AND a.foto_url IS NOT NULL
        AND a.fecha BETWEEN ${periodo.desde}::date AND ${periodo.hasta}::date
      ORDER BY a.fecha DESC LIMIT 12
    `,
    sql`
      SELECT u.genero, COUNT(DISTINCT u.id)::int AS count
      FROM inscripciones_espacio ie
      JOIN usuarios u ON ie.beneficiario_id = u.id
      WHERE ie.espacio_id = ANY(${espaciosIds})
      GROUP BY u.genero
    `,
    sql`
      SELECT pb.edad
      FROM inscripciones_espacio ie
      JOIN perfiles_beneficiarios pb ON ie.beneficiario_id = pb.usuario_id
      WHERE ie.espacio_id = ANY(${espaciosIds})
    `,
  ]);

  // Horas por pasante
  const pasantesHoras = await Promise.all(
    pasantesRes.map(async (p: any) => {
      const [hMes] = await sql`
        SELECT ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1)::float AS total
        FROM asistencia_espacio a
        JOIN asistencia_instructores ai ON ai.asistencia_id = a.id
        WHERE ai.usuario_id = ${p.id}
          AND a.estado_aprobacion = 'aprobado'
          AND a.fecha BETWEEN ${periodo.desde}::date AND ${periodo.hasta}::date
      `;
      const [hAcum] = await sql`
        SELECT ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1)::float AS total
        FROM asistencia_espacio a
        JOIN asistencia_instructores ai ON ai.asistencia_id = a.id
        WHERE ai.usuario_id = ${p.id}
          AND a.estado_aprobacion = 'aprobado'
      `;
      return {
        id: p.id,
        nombre: `${p.nombres} ${p.apellidos}`,
        horas_mes: hMes?.total || 0,
        horas_acumuladas: hAcum?.total || 0,
      };
    })
  );

  const generoMap: Record<string, number> = { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0 };
  generoRes.forEach((g: any) => {
    const key = g.genero || 'prefiero_no_decir';
    generoMap[key] = (generoMap[key] || 0) + g.count;
  });

  const edadMap: Record<string, number> = { '<18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '>50': 0, 'Sin dato': 0 };
  edadRes.forEach((e: any) => {
    const rango = clasificarRangoEdad(e.edad);
    edadMap[rango] = (edadMap[rango] || 0) + 1;
  });

  const totalSesiones = tareasRes.reduce((acc: number, t: any) => acc + t.sesiones_aprobadas, 0) + noPrevistasRes.length;

  return {
    periodo,
    general: {
      proyecto_nombre: proyecto?.nombre || 'Proyecto de Vinculación PINE',
      unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación',
      carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      codigo_documento: proyecto?.codigo_documento_supervisor || 'PINE-INF-SUP',
      revision_documento: proyecto?.revision_documento_supervisor || '01',
      supervisor_nombre: supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : 'Supervisor',
      supervisor_email: supervisor?.email || '',
      mes: periodo.etiqueta,
      total_pasantes: pasantesRes.length,
      total_beneficiarios: beneficiariosRes[0]?.total || 0,
      total_sesiones: totalSesiones,
      zona: proyecto?.zona || 'Distrito 13D02 Manta',
      espacios: espacios.map((e: any) => e.nombre),
    },
    tareas: tareasRes,
    no_previstas: noPrevistasRes,
    participacion: {
      pasantes: pasantesHoras,
      genero: generoMap,
      edad: edadMap,
    },
    fotos: fotosRes,
  };
}

export async function datosInformeLider(
  sql: NeonQueryFunction<false, false>,
  params: { cicloId: number }
) {
  const periodo = await resolverPeriodo(sql, { tipo: 'lider', cicloId: params.cicloId });

  const [proyecto] = await sql`
    SELECT * FROM proyectos WHERE id = 'vinculacion'
  `;

  const [lider] = await sql`
    SELECT id, nombres, apellidos, email FROM usuarios WHERE email = ${proyecto?.lider_email || 'cintya.gamez@uleam.edu.ec'}
  `;

  const [firmante] = await sql`
    SELECT id, nombres, apellidos, cargo_institucional FROM usuarios WHERE id = ${proyecto?.firmante_responsable_id || 1}
  `;

  const [ciclo] = await sql`
    SELECT id, nombre FROM ciclos_academicos WHERE id = ${params.cicloId}
  `;

  const [objetivosRes, metasRes, presupuestoRes, textosRes, evolucionRes] = await Promise.all([
    sql`
      SELECT o.id, o.texto AS descripcion, o.tipo,
             COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
               'id', a.id,
               'descripcion', a.actividad,
               'metodologia', a.metodologia
             )) FILTER (WHERE a.id IS NOT NULL), '[]') AS actividades
      FROM proyecto_objetivos o
      LEFT JOIN proyecto_actividades_plan a ON a.objetivo_id = o.id AND a.activo = true
      WHERE o.proyecto_id = 'vinculacion' AND o.activo = true
      GROUP BY o.id, o.texto, o.tipo
      ORDER BY o.orden ASC
    `,
    sql`
      SELECT * FROM proyecto_metas_ciclo WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${params.cicloId}
    `,
    sql`
      SELECT cedula_presupuestaria AS partida, concepto AS descripcion,
             solicitado AS monto_solicitado, ejecutado AS monto_ejecutado,
             CASE WHEN COALESCE(solicitado, 0) > 0 THEN ROUND((COALESCE(ejecutado, 0) / solicitado * 100)::numeric, 1)::float ELSE 0 END AS porcentaje_ejecucion
      FROM proyecto_presupuesto WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${params.cicloId}
    `,
    sql`
      SELECT clave, texto FROM proyecto_textos_ciclo WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${params.cicloId}
    `,
    sql`
      SELECT
        to_char(date_trunc('month', a.fecha), 'YYYY-MM') AS mes,
        COUNT(a.id)::int AS sesiones,
        ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1)::float AS horas
      FROM asistencia_espacio a
      JOIN "espacios_enseñanza" e ON a.espacio_id = e.id
      WHERE e.area = 'vinculacion' AND a.estado_aprobacion = 'aprobado'
      GROUP BY date_trunc('month', a.fecha)
      ORDER BY mes ASC
    `,
  ]);

  const [realesRes] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(DISTINCT ei.usuario_id)::int FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON ei.espacio_id = e.id WHERE e.ciclo_id = ${params.cicloId}) AS estudiantes_reales,
        (SELECT COUNT(DISTINCT e.profesor_id)::int FROM "espacios_enseñanza" e WHERE e.ciclo_id = ${params.cicloId}) AS docentes_reales,
        (SELECT COUNT(DISTINCT ie.beneficiario_id)::int FROM inscripciones_espacio ie JOIN "espacios_enseñanza" e ON ie.espacio_id = e.id WHERE e.ciclo_id = ${params.cicloId}) AS beneficiarios_directos_reales
    `,
  ]);

  const textosMap: Record<string, string> = {};
  textosRes.forEach((t: any) => { textosMap[t.clave] = t.texto; });

  const metas = metasRes[0] || {};
  const reales = realesRes[0] || {};

  return {
    ciclo: { id: params.cicloId, nombre: ciclo?.nombre || periodo.etiqueta },
    general: {
      proyecto_nombre: proyecto?.nombre || 'Proyecto de Vinculación PINE',
      codigo: proyecto?.codigo || 'PINE-VINC-2026',
      unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación',
      carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      entidad_beneficiaria: proyecto?.entidad_beneficiaria || 'Comunidad local',
      vigencia_inicio: proyecto?.vigencia_inicio || '2026-01-01',
      vigencia_fin: proyecto?.vigencia_fin || '2028-12-31',
      ods: proyecto?.ods || 'ODS 4: Educación de Calidad',
      linea_investigacion: proyecto?.linea_investigacion || 'Inclusión e Interculturalidad',
      zona: proyecto?.zona || 'Distrito 13D02 Manta',
      lider_nombre: lider ? `${lider.nombres} ${lider.apellidos}` : 'Líder del Proyecto',
      lider_email: lider?.email || '',
      firmante_nombre: firmante ? `${firmante.nombres} ${firmante.apellidos}` : 'Responsable de Vinculación',
      firmante_cargo: firmante?.cargo_institucional || 'Responsable de Vinculación y Emprendimiento',
      codigo_documento: proyecto?.codigo_documento_lider || 'PINE-INF-LID',
      revision_documento: proyecto?.revision_documento_lider || '01',
    },
    objetivos: objetivosRes,
    metas: {
      meta_estudiantes: metas.meta_estudiantes || 0,
      estudiantes_reales: reales.estudiantes_reales || 0,
      meta_docentes: metas.meta_docentes || 0,
      docentes_reales: reales.docentes_reales || 0,
      meta_beneficiarios_directos: metas.meta_beneficiarios_directos || 0,
      beneficiarios_directos_reales: reales.beneficiarios_directos_reales || 0,
      meta_beneficiarios_indirectos: metas.meta_beneficiarios_indirectos || 0,
      beneficiarios_indirectos_reales: metas.meta_beneficiarios_indirectos || 0,
    },
    presupuesto: presupuestoRes,
    textos: textosMap,
    evolucion: evolucionRes,
  };
}
