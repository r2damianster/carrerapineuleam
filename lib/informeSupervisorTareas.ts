// Datos del "Informe de Seguimiento de Tareas (Supervisor)" — formato institucional.
// Las tareas salen de proyecto_actividades_plan (marco lógico) y cada una se calcula desde su `fuente`.
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { clasificarRangoEdad } from './informesVinculacion';
import { periodoDeMes, type PeriodoProyecto } from './periodosProyecto';

type Sql = NeonQueryFunction<false, false>;

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MAXIMO_FOTOS = 6;

export interface ContextoSupervisor {
  supervisorId: number;
  espaciosClubIds: number[];
  espaciosInvestigacionIds: number[];
  pasantesIds: number[];
}

export interface RegistrosFuente {
  cantidad: number | null; // valor medido contra la meta (espacios, programas, %…)
  pasantesIds: number[];
  sesiones: number;
  horas: number;
  detalle: string;
  audiencia?: number; // audiencia alcanzada (podcasts y eventos)
}

export interface TareaInforme {
  codigo: string;
  nombre: string;
  meta: number | null;
  unidad: string;
  fuente: string;
  realizado: number | null;
  avance: number | null; // 0-100
  alumnos: number;
  audiencia: number;
  productos_sociales: string;
  productos_academicos: string;
  observaciones: string;
  mesInicio: number | null;
  mesFin: number | null;
  ejecucionPorMes: Record<number, boolean>;
}

const dosDigitos = (valor: number) => String(valor).padStart(2, '0');

function calcularAvance(realizado: number | null, meta: number | null): number | null {
  if (realizado == null || meta == null || meta <= 0) return null;
  return Math.min(100, Math.round((realizado / meta) * 100));
}

function mesDeFecha(valor: unknown): number | null {
  const texto = String(valor ?? '');
  const coincidencia = /^\d{4}-(\d{2})/.exec(texto);
  return coincidencia ? Number(coincidencia[1]) : null;
}

/** Mide lo realizado por una tarea entre `desde` y `hasta`, según su fuente. */
export async function registrosPorFuente(
  sql: Sql,
  fuente: string,
  contexto: ContextoSupervisor,
  desde: string,
  hasta: string
): Promise<RegistrosFuente> {
  const vacio: RegistrosFuente = { cantidad: 0, pasantesIds: [], sesiones: 0, horas: 0, detalle: '' };
  const { pasantesIds, espaciosClubIds, supervisorId } = contexto;
  const idsPasantes = pasantesIds.length ? pasantesIds : [0];

  if (fuente === 'asistencia_club') {
    if (!espaciosClubIds.length) return vacio;
    const [resumen] = await sql`
      SELECT COUNT(DISTINCT a.espacio_id)::int AS espacios,
             COUNT(a.id)::int AS sesiones,
             COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1), 0)::float AS horas
      FROM asistencia_espacio a
      WHERE a.espacio_id = ANY(${espaciosClubIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const instructores = await sql`
      SELECT DISTINCT ai.usuario_id
      FROM asistencia_instructores ai
      JOIN asistencia_espacio a ON a.id = ai.asistencia_id
      WHERE a.espacio_id = ANY(${espaciosClubIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    return {
      cantidad: resumen.espacios,
      pasantesIds: instructores.map((fila: any) => fila.usuario_id),
      sesiones: resumen.sesiones,
      horas: resumen.horas,
      detalle: `${resumen.sesiones} sesiones aprobadas en ${resumen.espacios} espacio(s), ${resumen.horas} h`,
    };
  }

  if (fuente === 'autonomas_encuesta') {
    const [autonomas] = await sql`
      SELECT COUNT(*)::int AS actividades, COALESCE(SUM(horas), 0)::float AS horas
      FROM actividades_autonomas_pasante
      WHERE usuario_id = ANY(${idsPasantes}) AND estado_aprobacion = 'aprobado'
        AND fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const autores = await sql`
      SELECT DISTINCT usuario_id FROM actividades_autonomas_pasante
      WHERE usuario_id = ANY(${idsPasantes}) AND estado_aprobacion = 'aprobado'
        AND fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const espaciosSupervisor = [...espaciosClubIds, ...contexto.espaciosInvestigacionIds];
    const [encuesta] = espaciosSupervisor.length
      ? await sql`
          SELECT COUNT(*)::int AS respuestas, AVG(es.nivel_satisfaccion)::float AS promedio
          FROM encuestas_satisfaccion es
          WHERE es.beneficiario_id IN (SELECT ie.beneficiario_id FROM inscripciones_espacio ie WHERE ie.espacio_id = ANY(${espaciosSupervisor}))
            AND es.fecha BETWEEN ${desde}::date AND ${hasta}::date
        `
      : [{ respuestas: 0, promedio: null }];
    const satisfaccion = encuesta.promedio != null ? Math.round((encuesta.promedio / 5) * 1000) / 10 : null;
    if (!autonomas.actividades && satisfaccion == null) return { ...vacio, cantidad: null };
    const partes = [] as string[];
    if (autonomas.actividades) partes.push(`${autonomas.actividades} actividades de planificación/recursos (${autonomas.horas} h)`);
    partes.push(satisfaccion != null ? `satisfacción ${satisfaccion}% (${encuesta.respuestas} encuestas)` : 'sin encuestas de satisfacción aplicadas');
    return {
      cantidad: satisfaccion ?? 0,
      pasantesIds: autores.map((fila: any) => fila.usuario_id),
      sesiones: autonomas.actividades,
      horas: autonomas.horas,
      detalle: partes.join('; '),
    };
  }

  if (fuente === 'podcast') {
    const episodios = await sql`
      SELECT v.id, v.title, hp.usuario_id, COALESCE(v.audiencia_alcanzada, 0)::int AS audiencia
      FROM horas_podcast_pasante hp
      JOIN videos v ON v.id = hp.video_id
      WHERE hp.usuario_id = ANY(${idsPasantes}) AND hp.estado_aprobacion = 'aprobado'
        AND LEFT(COALESCE(v.published_date::text, v.created::text), 10)::date BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const ids = Array.from(new Set(episodios.map((fila: any) => fila.id)));
    const audienciaPodcast = ids.reduce((total: number, id: any) => total + (episodios.find((fila: any) => fila.id === id)?.audiencia ?? 0), 0);
    return {
      cantidad: ids.length,
      audiencia: audienciaPodcast,
      pasantesIds: Array.from(new Set(episodios.map((fila: any) => fila.usuario_id))),
      sesiones: ids.length,
      horas: 0,
      detalle: ids.length ? `${ids.length} episodio(s) de podcast aprobados, audiencia alcanzada: ${audienciaPodcast} personas` : '',
    };
  }

  if (fuente === 'evento') {
    const eventos = await sql`
      SELECT d.id, d.titulo, d.registrador_id, COALESCE(d.audiencia_alcanzada, 0)::int AS audiencia
      FROM actividades_difusion d
      WHERE d.tipo <> 'podcast' AND d.aprobado_sitio = true
        AND d.fecha BETWEEN ${desde}::date AND ${hasta}::date
        AND (d.registrador_id = ANY(${[...idsPasantes, supervisorId]}) OR ${supervisorId} = ANY(d.profesores_responsables))
    `;
    const audienciaEventos = eventos.reduce((total: number, fila: any) => total + fila.audiencia, 0);
    return {
      cantidad: eventos.length,
      audiencia: audienciaEventos,
      pasantesIds: Array.from(new Set(eventos.map((fila: any) => fila.registrador_id).filter((id: number) => pasantesIds.includes(id)))),
      sesiones: eventos.length,
      horas: 0,
      detalle: eventos.length ? `Eventos: ${eventos.map((fila: any) => fila.titulo).join('; ')} (audiencia alcanzada: ${audienciaEventos})` : '',
    };
  }

  if (fuente === 'investigacion') {
    const actividades = await sql`
      SELECT usuario_id, COALESCE(SUM(horas), 0)::float AS horas, COUNT(*)::int AS registros
      FROM actividades_investigacion_pasante
      WHERE usuario_id = ANY(${idsPasantes}) AND estado_aprobacion = 'aprobado'
        AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      GROUP BY usuario_id
    `;
    const horas = actividades.reduce((total: number, fila: any) => total + fila.horas, 0);
    return {
      cantidad: actividades.length,
      pasantesIds: actividades.map((fila: any) => fila.usuario_id),
      sesiones: actividades.reduce((total: number, fila: any) => total + fila.registros, 0),
      horas,
      detalle: actividades.length ? `${actividades.length} estudiante(s) con actividades de investigación aprobadas (${horas} h)` : '',
    };
  }

  return { ...vacio, cantidad: null };
}

function elegirFotos(candidatas: any[]): any[] {
  const mezcladas = [...candidatas].sort(() => Math.random() - 0.5);
  // Las marcadas por el supervisor primero; luego una por espacio; luego el resto al azar.
  const marcadas = mezcladas.filter(foto => foto.usar_en_informe);
  const elegidas: any[] = [];
  const espaciosUsados = new Set<string>();
  const agregar = (foto: any) => {
    if (elegidas.length < MAXIMO_FOTOS && !elegidas.includes(foto)) elegidas.push(foto);
  };
  marcadas.forEach(agregar);
  marcadas.forEach(foto => espaciosUsados.add(foto.espacio_nombre));
  mezcladas.forEach(foto => {
    if (!espaciosUsados.has(foto.espacio_nombre)) {
      espaciosUsados.add(foto.espacio_nombre);
      agregar(foto);
    }
  });
  mezcladas.forEach(agregar);
  return elegidas;
}

export async function datosInformeSupervisor(
  sql: Sql,
  params: { supervisorId: number; mes: string }
) {
  const mes = params.mes.slice(0, 7);
  const [anioTexto, mesTexto] = mes.split('-');
  const anio = Number(anioTexto);
  const numeroMes = Number(mesTexto);
  const ultimoDia = new Date(anio, numeroMes, 0).getDate();
  const desdeMes = `${mes}-01`;
  const hastaMes = `${mes}-${dosDigitos(ultimoDia)}`;

  // Periodo fijo del proyecto (abr–ago / sep–dic). Enero–marzo no tiene periodo: se usa solo el mes.
  const periodoProyecto: PeriodoProyecto | null = periodoDeMes(mes);
  const desdePeriodo = periodoProyecto?.desde ?? desdeMes;
  const mesesPeriodo = periodoProyecto
    ? Array.from({ length: periodoProyecto.mesFin - periodoProyecto.mesInicio + 1 }, (_, indice) => periodoProyecto.mesInicio + indice)
    : [numeroMes];
  const etiquetaMes = `${NOMBRES_MESES[numeroMes - 1]} ${anio}`;
  const etiquetaPeriodo = periodoProyecto
    ? `Periodo ${periodoProyecto.etiqueta} (${NOMBRES_MESES[periodoProyecto.mesInicio - 1]} a ${NOMBRES_MESES[periodoProyecto.mesFin - 1]} ${anio})`
    : etiquetaMes;

  const [proyecto] = await sql`
    SELECT id, nombre_oficial, codigo, unidad_academica, carrera, entidad_beneficiaria, zona,
           to_char(vigencia_inicio, 'DD/MM/YYYY') AS vigencia_inicio, to_char(vigencia_fin, 'DD/MM/YYYY') AS vigencia_fin,
           codigo_documento_supervisor, revision_documento_supervisor, lider_id, lider_nombre
    FROM proyectos WHERE id = 'vinculacion'
  `;
  const [supervisor] = await sql`SELECT id, nombres, apellidos, email FROM usuarios WHERE id = ${params.supervisorId}`;
  const [lider] = proyecto?.lider_id
    ? await sql`SELECT nombres, apellidos FROM usuarios WHERE id = ${proyecto.lider_id}`
    : [null];

  const espacios = await sql`
    SELECT id, nombre, categoria FROM "espacios_enseñanza"
    WHERE area = 'vinculacion' AND profesor_id = ${params.supervisorId}
    ORDER BY nombre ASC
  `;
  const espaciosIds = espacios.map((espacio: any) => espacio.id);
  const idsConsulta = espaciosIds.length ? espaciosIds : [0];

  const pasantes = await sql`
    SELECT DISTINCT u.id, u.nombres, u.apellidos
    FROM espacio_instructores ei JOIN usuarios u ON ei.usuario_id = u.id
    WHERE ei.espacio_id = ANY(${idsConsulta})
    ORDER BY u.apellidos, u.nombres
  `;
  const contexto: ContextoSupervisor = {
    supervisorId: params.supervisorId,
    espaciosClubIds: espacios.filter((espacio: any) => espacio.categoria === 'club').map((espacio: any) => espacio.id),
    espaciosInvestigacionIds: espacios.filter((espacio: any) => espacio.categoria === 'investigacion').map((espacio: any) => espacio.id),
    pasantesIds: pasantes.map((pasante: any) => pasante.id),
  };

  // Tareas del plan (marco lógico) del ciclo cuyo nombre coincide con el periodo fijo, p. ej. "2026-2".
  const plan = periodoProyecto
    ? await sql`
        SELECT a.id, a.actividad, a.meta_cantidad::float AS meta, a.unidad, a.fuente,
               to_char(a.mes_inicio, 'MM')::int AS mes_inicio, to_char(a.mes_fin, 'MM')::int AS mes_fin
        FROM proyecto_actividades_plan a
        JOIN ciclos_academicos c ON c.id = a.ciclo_id
        WHERE a.activo = true AND c.nombre = ${periodoProyecto.etiqueta}
        ORDER BY a.actividad ASC
      `
    : [];

  const tareas: TareaInforme[] = await Promise.all(
    plan.map(async (actividad: any) => {
      const acumulado = await registrosPorFuente(sql, actividad.fuente, contexto, desdePeriodo, hastaMes);
      const ejecucionPorMes: Record<number, boolean> = {};
      await Promise.all(
        mesesPeriodo.filter(mesPeriodo => mesPeriodo <= numeroMes).map(async mesPeriodo => {
          const desdeMesPeriodo = `${anio}-${dosDigitos(mesPeriodo)}-01`;
          const hastaMesPeriodo = `${anio}-${dosDigitos(mesPeriodo)}-${dosDigitos(new Date(anio, mesPeriodo, 0).getDate())}`;
          const delMes = await registrosPorFuente(sql, actividad.fuente, contexto, desdeMesPeriodo, hastaMesPeriodo);
          ejecucionPorMes[mesPeriodo] = (delMes.cantidad ?? 0) > 0 || delMes.sesiones > 0;
        })
      );
      const codigo = /^(\d+\.\d+)/.exec(actividad.actividad)?.[1] ?? '';
      const nombre = String(actividad.actividad).split(' Meta:')[0].replace(/^\d+\.\d+\s*/, '').trim();
      return {
        codigo,
        nombre,
        meta: actividad.meta,
        unidad: actividad.unidad || '',
        fuente: actividad.fuente,
        realizado: acumulado.cantidad,
        avance: calcularAvance(acumulado.cantidad, actividad.meta),
        alumnos: acumulado.pasantesIds.length,
        audiencia: acumulado.audiencia ?? 0,
        productos_sociales: '',
        productos_academicos: '',
        observaciones: acumulado.detalle,
        mesInicio: actividad.mes_inicio,
        mesFin: actividad.mes_fin,
        ejecucionPorMes,
      };
    })
  );

  // Actividades no previstas (2.3): sesiones aprobadas en espacios de categoría "otro" o marcadas como no previstas,
  // más las actividades que el supervisor registra a mano en el informe.
  const idsOtro = espacios.filter((espacio: any) => espacio.categoria === 'otro').map((espacio: any) => espacio.id);
  const sesionesFueraDePlan = await sql`
    SELECT e.nombre AS espacio_nombre, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, a.observaciones,
           (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS pasantes,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS beneficiarios_atendidos,
           ROUND(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0::numeric, 1)::float AS horas_acreditadas
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND (a.espacio_id = ANY(${idsOtro.length ? idsOtro : [0]}) OR a.no_prevista = true)
      AND a.estado_aprobacion = 'aprobado'
      AND a.fecha BETWEEN ${desdePeriodo}::date AND ${hastaMes}::date
    ORDER BY a.fecha ASC
  `;
  const registradasAMano = await sql`
    SELECT id, tarea, avance, alumnos, productos_sociales, productos_academicos, observaciones
    FROM informe_no_previstas
    WHERE supervisor_id = ${params.supervisorId} AND mes BETWEEN ${desdePeriodo}::date AND ${hastaMes}::date
    ORDER BY mes ASC, id ASC
  `;
  const noPrevistas = [
    ...sesionesFueraDePlan.map((sesion: any) => ({
      id: null,
      manual: false,
      tarea: `Sesión en ${sesion.espacio_nombre} (${sesion.fecha})`,
      avance: 100,
      alumnos: sesion.pasantes ?? 0,
      productos_sociales: `${sesion.beneficiarios_atendidos ?? 0} beneficiarios atendidos`,
      productos_academicos: '',
      observaciones: [`${sesion.horas_acreditadas ?? 0} h`, sesion.observaciones].filter(Boolean).join('. '),
    })),
    ...registradasAMano.map((actividad: any) => ({ ...actividad, manual: true })),
  ];

  const [beneficiarios] = await sql`
    SELECT COUNT(DISTINCT ie.beneficiario_id)::int AS total FROM inscripciones_espacio ie WHERE ie.espacio_id = ANY(${idsConsulta})
  `;
  const generoFilas = await sql`
    SELECT u.genero, COUNT(DISTINCT u.id)::int AS cantidad
    FROM inscripciones_espacio ie JOIN usuarios u ON ie.beneficiario_id = u.id
    WHERE ie.espacio_id = ANY(${idsConsulta}) GROUP BY u.genero
  `;
  const edadFilas = await sql`
    SELECT pb.edad FROM inscripciones_espacio ie
    JOIN perfiles_beneficiarios pb ON ie.beneficiario_id = pb.usuario_id
    WHERE ie.espacio_id = ANY(${idsConsulta})
  `;
  const genero: Record<string, number> = { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0 };
  generoFilas.forEach((fila: any) => { const clave = fila.genero || 'prefiero_no_decir'; genero[clave] = (genero[clave] || 0) + fila.cantidad; });
  const edad: Record<string, number> = { '<18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '>50': 0, 'Sin dato': 0 };
  edadFilas.forEach((fila: any) => { const rango = clasificarRangoEdad(fila.edad); edad[rango] = (edad[rango] || 0) + 1; });

  // Participación de estudiantes: horas por pasante en el periodo y agrupación por espacio.
  const horasPasantes = await sql`
    SELECT u.id, u.nombres, u.apellidos,
           COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1), 0)::float AS horas_periodo,
           COUNT(DISTINCT a.espacio_id)::int AS espacios
    FROM usuarios u
    LEFT JOIN asistencia_instructores ai ON ai.usuario_id = u.id
    LEFT JOIN asistencia_espacio a ON a.id = ai.asistencia_id AND a.estado_aprobacion = 'aprobado'
         AND a.fecha BETWEEN ${desdePeriodo}::date AND ${hastaMes}::date AND a.espacio_id = ANY(${idsConsulta})
    WHERE u.id = ANY(${contexto.pasantesIds.length ? contexto.pasantesIds : [0]})
    GROUP BY u.id, u.nombres, u.apellidos ORDER BY u.apellidos, u.nombres
  `;
  const gruposEspacios = await sql`
    SELECT e.nombre, e.categoria,
           (SELECT COUNT(*) FROM espacio_instructores ei WHERE ei.espacio_id = e.id)::int AS pasantes,
           (SELECT COUNT(DISTINCT ie.beneficiario_id) FROM inscripciones_espacio ie WHERE ie.espacio_id = e.id)::int AS beneficiarios
    FROM "espacios_enseñanza" e WHERE e.id = ANY(${idsConsulta}) ORDER BY e.nombre
  `;

  // Fotos: sesiones aprobadas del mes con foto; una por espacio primero, al azar.
  const fotosCandidatas = await sql`
    SELECT a.foto_url AS url, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, e.nombre AS espacio_nombre, a.usar_en_informe,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS num_beneficiarios,
           (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS num_pasantes
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado' AND a.foto_url IS NOT NULL
      AND a.fecha BETWEEN ${desdeMes}::date AND ${hastaMes}::date
  `;

  const [sesionesTotales] = await sql`
    SELECT COUNT(*)::int AS total FROM asistencia_espacio a
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado'
      AND a.fecha BETWEEN ${desdePeriodo}::date AND ${hastaMes}::date
  `;
  return {
    periodo: { desde: desdePeriodo, hasta: hastaMes, etiqueta: etiquetaMes, etiquetaPeriodo, mesesPeriodo, mesElegido: numeroMes, anio },
    general: {
      proyecto_nombre: proyecto?.nombre_oficial || 'Dinámicas Lingüísticas en Contextos Locales',
      proyecto_codigo: proyecto?.codigo || '',
      unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación, Turismo, Artes y Humanidades',
      carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      entidad_beneficiaria: proyecto?.entidad_beneficiaria || '',
      vigencia: proyecto?.vigencia_inicio && proyecto?.vigencia_fin ? `${proyecto.vigencia_inicio} - ${proyecto.vigencia_fin}` : '',
      codigo_documento: proyecto?.codigo_documento_supervisor || '',
      revision_documento: proyecto?.revision_documento_supervisor || '',
      supervisor_nombre: supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : 'Supervisor',
      supervisor_email: supervisor?.email || '',
      lider_nombre: lider ? `${lider.nombres} ${lider.apellidos}` : proyecto?.lider_nombre || '',
      mes: etiquetaMes,
      total_pasantes: pasantes.length,
      total_beneficiarios: beneficiarios?.total || 0,
      total_sesiones: sesionesTotales?.total || 0,
      zona: proyecto?.zona || '',
      espacios: espacios.map((espacio: any) => espacio.nombre),
    },
    tareas,
    no_previstas: noPrevistas,
    participacion: {
      pasantes: horasPasantes,
      grupos: gruposEspacios,
      genero,
      edad,
      audiencia_podcast: tareas.filter(tarea => tarea.fuente === 'podcast').reduce((total, tarea) => total + tarea.audiencia, 0),
    },
    fotos: elegirFotos(fotosCandidatas),
  };
}

/** Textos existentes del periodo (observaciones, comentarios, rechazos) para deducir obstáculos. */
export async function recopilarSenalesObstaculos(sql: Sql, supervisorId: number, mes: string) {
  const mesNormalizado = mes.slice(0, 7);
  const periodoProyecto = periodoDeMes(mesNormalizado);
  const desde = periodoProyecto?.desde ?? `${mesNormalizado}-01`;
  const hasta = `${mesNormalizado}-${dosDigitos(new Date(Number(mesNormalizado.slice(0, 4)), Number(mesNormalizado.slice(5, 7)), 0).getDate())}`;
  const sesiones = await sql`
    SELECT e.nombre AS espacio, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, a.estado_aprobacion AS estado,
           a.observaciones, a.comentario_supervisor, a.motivo_rechazo
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE e.area = 'vinculacion' AND e.profesor_id = ${supervisorId}
      AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    ORDER BY a.fecha DESC
  `;
  const conTexto = sesiones
    .filter((sesion: any) => sesion.observaciones || sesion.comentario_supervisor || sesion.motivo_rechazo)
    .map((sesion: any) => ({
      espacio: sesion.espacio,
      fecha: sesion.fecha,
      texto: [sesion.observaciones, sesion.comentario_supervisor, sesion.motivo_rechazo ? `Rechazada: ${sesion.motivo_rechazo}` : ''].filter(Boolean).join(' | '),
    }));
  return {
    observaciones: conTexto,
    sesionesPendientes: sesiones.filter((sesion: any) => sesion.estado === 'pendiente').length,
    sesionesRechazadas: sesiones.filter((sesion: any) => sesion.estado === 'rechazado').length,
    sesionesTotales: sesiones.length,
  };
}
