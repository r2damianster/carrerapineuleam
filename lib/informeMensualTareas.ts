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
        SELECT id, nombre, categoria, zona_canton, zona_parroquia, zona_barrio, zona_ubicacion
        FROM "espacios_enseñanza" WHERE area = 'vinculacion' AND profesor_id = ${params.supervisorId} ORDER BY nombre ASC
      `
    : await sql`
        SELECT id, nombre, categoria, zona_canton, zona_parroquia, zona_barrio, zona_ubicacion
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
  const difusionDelMes = params.supervisorId
    ? await sql`
        SELECT titulo, descripcion, tipo FROM actividades_difusion
        WHERE aprobado_sitio = true AND proyecto = 'vinculacion' AND ${params.supervisorId} = ANY(profesores_responsables)
          AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      `
    : await sql`
        SELECT titulo, descripcion, tipo FROM actividades_difusion
        WHERE aprobado_sitio = true AND proyecto = 'vinculacion' AND fecha BETWEEN ${desde}::date AND ${hasta}::date
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
  };
}
