// Datos del informe MENSUAL de Vinculación (líder y supervisor) — Sesión 57.
// Distinto del informe SEMESTRAL (informeSupervisorTareas.ts/informeLiderTareas.ts, marco
// lógico por tarea/meta): este es el formato simple que ya usaba el proyecto en Word a mano
// ("INFORME MENSUAL DEL SUPERVISOR/LÍDER DEL PROYECTO DE VINCULACIÓN") — actividades narrativas
// del mes, beneficiarios y zona por espacio, evidencias fotográficas, observaciones. Ambos
// formatos conviven: el semestral no se reemplaza, este es adicional.
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { elegirFotos } from './informeSupervisorTareas';

type Sql = NeonQueryFunction<false, false>;

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function hoyEcuadorTexto(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface BeneficiariosEspacio {
  id: number;
  nombre: string;
  total: number;
  mujeres: number;
  hombres: number;
  otros: number;
  zona: { canton: string; parroquia: string; barrio: string; ubicacion: string };
}

export interface DatosInformeMensual {
  mes: string; // YYYY-MM
  etiquetaMes: string; // "Mayo 2026"
  general: {
    proyecto_nombre: string;
    unidad_academica: string;
    carrera: string;
    lider_nombre: string;
    supervisor_nombre: string;
    fecha_emision: string;
    total_beneficiarios: number;
  };
  espacios: BeneficiariosEspacio[];
  actividades: string[];
  evidencias: { url: string; fecha: string; espacio_nombre: string; num_beneficiarios: number; num_pasantes: number }[];
  observaciones: string;
  /** Horas acreditadas por pasante en el mes, agrupadas por espacio — para la tabla "Horas de los pasantes". */
  pasantes: { espacio_nombre: string; supervisor_nombre: string; estudiante_nombre: string; horas_mes: number }[];
  /** Solo informe del líder: qué docente supervisa a qué pasantes, por espacio ("Distribución de estudiantes y docentes supervisores"). */
  distribucion: { espacio_nombre: string; supervisor_nombre: string; pasantes: string[] }[];
}

/** `datosSupervisorId = null` → informe del líder (todos los espacios del proyecto). */
export async function datosInformeMensual(sql: Sql, params: { supervisorId: number | null; mes: string }): Promise<DatosInformeMensual> {
  const [anioTexto, mesTexto] = params.mes.split('-');
  const anio = Number(anioTexto);
  const mesNum = Number(mesTexto);
  if (!anio || !mesNum || mesNum < 1 || mesNum > 12) throw new Error('Mes inválido, se espera formato YYYY-MM');
  const desde = `${params.mes}-01`;
  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  const hoy = hoyEcuadorTexto();
  const hastaMes = `${params.mes}-${String(ultimoDia).padStart(2, '0')}`;
  const hasta = hoy < hastaMes ? hoy : hastaMes;
  const etiquetaMes = `${NOMBRES_MESES[mesNum - 1]} ${anio}`;

  const [proyecto] = await sql`SELECT id, nombre_oficial, unidad_academica, carrera, lider_id, lider_nombre FROM proyectos WHERE id = 'vinculacion'`;
  const [lider] = proyecto?.lider_id
    ? await sql`SELECT nombres, apellidos FROM usuarios WHERE id = ${proyecto.lider_id}`
    : [null];
  const [supervisor] = params.supervisorId
    ? await sql`SELECT id, nombres, apellidos, email FROM usuarios WHERE id = ${params.supervisorId}`
    : [null];

  const espacios = params.supervisorId
    ? await sql`
        SELECT id, nombre, categoria, profesor_id, zona_canton, zona_parroquia, zona_barrio, zona_ubicacion
        FROM "espacios_enseñanza" WHERE area = 'vinculacion' AND profesor_id = ${params.supervisorId} ORDER BY nombre ASC
      `
    : await sql`
        SELECT id, nombre, categoria, profesor_id, zona_canton, zona_parroquia, zona_barrio, zona_ubicacion
        FROM "espacios_enseñanza" WHERE area = 'vinculacion' ORDER BY nombre ASC
      `;
  const idsConsulta = espacios.length ? espacios.map((espacio: any) => espacio.id) : [0];

  // Beneficiarios por espacio, desglosados por sexo (mismo criterio que el informe semestral).
  const generoPorEspacio = await sql`
    SELECT ie.espacio_id, u.genero, COUNT(DISTINCT u.id)::int AS cantidad
    FROM inscripciones_espacio ie JOIN usuarios u ON ie.beneficiario_id = u.id
    WHERE ie.espacio_id = ANY(${idsConsulta})
    GROUP BY ie.espacio_id, u.genero
  `;
  const conteoPorEspacio = new Map<number, { total: number; mujeres: number; hombres: number; otros: number }>();
  espacios.forEach((espacio: any) => conteoPorEspacio.set(espacio.id, { total: 0, mujeres: 0, hombres: 0, otros: 0 }));
  generoPorEspacio.forEach((fila: any) => {
    const registro = conteoPorEspacio.get(fila.espacio_id);
    if (!registro) return;
    registro.total += fila.cantidad;
    if (fila.genero === 'femenino') registro.mujeres += fila.cantidad;
    else if (fila.genero === 'masculino') registro.hombres += fila.cantidad;
    else registro.otros += fila.cantidad;
  });

  const espaciosSalida: BeneficiariosEspacio[] = espacios.map((espacio: any) => ({
    id: espacio.id,
    nombre: espacio.nombre,
    ...(conteoPorEspacio.get(espacio.id) || { total: 0, mujeres: 0, hombres: 0, otros: 0 }),
    zona: {
      canton: espacio.zona_canton || '',
      parroquia: espacio.zona_parroquia || '',
      barrio: espacio.zona_barrio || '',
      ubicacion: espacio.zona_ubicacion || '',
    },
  }));

  // Actividades narrativas del mes: una línea por sesión de club con observaciones + eventos/podcasts de difusión aprobados.
  const sesionesDelMes = await sql`
    SELECT e.nombre AS espacio_nombre, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, a.observaciones
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado'
      AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    ORDER BY a.fecha ASC
  `;
  // `categoria` (no `proyecto`) es lo que marca un registro como de Vinculación — `proyecto`
  // (texto libre) solo se llena cuando categoria='investigacion' (selector de proyecto de
  // investigación), queda NULL en los de vinculación aunque sí sean de este proyecto.
  const difusionDelMes = params.supervisorId
    ? await sql`
        SELECT titulo, descripcion, tipo FROM actividades_difusion
        WHERE aprobado_sitio = true AND categoria = 'vinculacion' AND ${params.supervisorId} = ANY(profesores_responsables)
          AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      `
    : await sql`
        SELECT titulo, descripcion, tipo FROM actividades_difusion
        WHERE aprobado_sitio = true AND categoria = 'vinculacion' AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      `;
  const actividades = [
    ...sesionesDelMes
      .filter((sesion: any) => sesion.observaciones)
      .map((sesion: any) => `${sesion.espacio_nombre} (${sesion.fecha}): ${sesion.observaciones}`),
    ...difusionDelMes.map((actividad: any) => `${actividad.tipo === 'podcast' ? 'Podcast' : 'Evento'}: ${actividad.titulo}${actividad.descripcion ? ` — ${actividad.descripcion}` : ''}`),
  ];

  // Evidencias: fotos de sesiones aprobadas del mes (mismo criterio que el informe semestral).
  const fotosCandidatas = await sql`
    SELECT a.foto_url AS url, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, e.nombre AS espacio_nombre, a.usar_en_informe,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS num_beneficiarios,
           (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS num_pasantes
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado' AND a.foto_url IS NOT NULL
      AND NOT foto_descartada(a.foto_url)
      AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
  `;

  const totalBeneficiarios = espaciosSalida.reduce((suma, espacio) => suma + espacio.total, 0);

  // Docentes supervisores por espacio (uno por espacio, vía profesor_id) — para la tabla de
  // horas y, en el informe del líder, para "Distribución de estudiantes y docentes supervisores".
  const idsSupervisoresEspacio = Array.from(new Set(espacios.map((espacio: any) => espacio.profesor_id).filter(Boolean)));
  const supervisoresEspacioFilas = idsSupervisoresEspacio.length
    ? await sql`SELECT id, nombres, apellidos FROM usuarios WHERE id = ANY(${idsSupervisoresEspacio})`
    : [];
  const nombreSupervisorPorId = new Map<number, string>(supervisoresEspacioFilas.map((fila: any) => [fila.id, `${fila.nombres} ${fila.apellidos}`]));

  // Pasantes por espacio, con horas acreditadas por asistencia en el mes.
  const pasantesPorEspacio = await sql`
    SELECT ei.espacio_id, u.id AS usuario_id, u.nombres, u.apellidos,
           COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1), 0)::float AS horas_mes
    FROM espacio_instructores ei
    JOIN usuarios u ON u.id = ei.usuario_id
    LEFT JOIN asistencia_instructores ai ON ai.usuario_id = u.id
    LEFT JOIN asistencia_espacio a ON a.id = ai.asistencia_id AND a.estado_aprobacion = 'aprobado'
         AND a.espacio_id = ei.espacio_id AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    WHERE ei.espacio_id = ANY(${idsConsulta})
    GROUP BY ei.espacio_id, u.id, u.nombres, u.apellidos
    ORDER BY u.apellidos, u.nombres
  `;
  const nombreEspacioPorId = new Map<number, string>(espacios.map((espacio: any) => [espacio.id, espacio.nombre]));
  const profesorIdPorEspacio = new Map<number, number>(espacios.map((espacio: any) => [espacio.id, espacio.profesor_id]));
  const pasantes = pasantesPorEspacio.map((fila: any) => ({
    espacio_nombre: nombreEspacioPorId.get(fila.espacio_id) || '',
    supervisor_nombre: nombreSupervisorPorId.get(profesorIdPorEspacio.get(fila.espacio_id) || 0) || '',
    estudiante_nombre: `${fila.nombres} ${fila.apellidos}`,
    horas_mes: fila.horas_mes,
  }));

  // Distribución de estudiantes y docentes supervisores (solo informe del líder): un bloque por espacio.
  const distribucion = params.supervisorId
    ? []
    : espacios.map((espacio: any) => ({
        espacio_nombre: espacio.nombre,
        supervisor_nombre: nombreSupervisorPorId.get(espacio.profesor_id) || 'Sin asignar',
        pasantes: pasantesPorEspacio
          .filter((fila: any) => fila.espacio_id === espacio.id)
          .map((fila: any) => `${fila.nombres} ${fila.apellidos}`),
      })).filter((bloque: { pasantes: string[] }) => bloque.pasantes.length > 0);

  return {
    mes: params.mes,
    etiquetaMes,
    general: {
      proyecto_nombre: proyecto?.nombre_oficial || 'Dinámicas Lingüísticas en Contextos Locales',
      unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación y Turismo',
      carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      lider_nombre: lider ? `${lider.nombres} ${lider.apellidos}` : proyecto?.lider_nombre || '',
      supervisor_nombre: supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : '',
      fecha_emision: hoy,
      total_beneficiarios: totalBeneficiarios,
    },
    espacios: espaciosSalida,
    actividades,
    evidencias: elegirFotos(fotosCandidatas, 6),
    observaciones: '',
    pasantes,
    distribucion,
  };
}
