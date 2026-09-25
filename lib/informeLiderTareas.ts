// Datos del "Informe de Avances y Logros Proyecto (Líder)" — formato institucional, semestral.
// A nivel de proyecto completo: suma lo aprobado de todos los supervisores en el periodo fijo
// (abril–agosto / septiembre–diciembre).
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { clasificarRangoEdad } from './informesVinculacion';
import { construirPeriodo } from './periodosProyecto';
import {
  registrosPorFuente,
  dosDigitos,
  type ContextoSupervisor,
  type TareaInforme,
} from './informeSupervisorTareas';

type Sql = NeonQueryFunction<false, false>;

const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const CLAVES_TEXTOS_LIDER = ['nuevos_problemas', 'contribucion_conocimientos', 'mejora_oferta', 'aporte_proyectos', 'problema_resultados'] as const;

export interface TareaLider extends TareaInforme {
  objetivo: string;
  metodologia: string;
}

export interface ProblemaResultado {
  causa: string;
  resultados: string;
  aporte_ensenanza: string;
  aporte_metas: string;
}

/** "PÉREZ LÓPEZ juan" -> "Pérez López Juan" (los nombres llegan con mayúsculas mezcladas). */
export function tituloNombre(texto: string): string {
  const particulas = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);
  return String(texto || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra, indice) => (indice > 0 && particulas.has(palabra) ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1)))
    .join(' ');
}

/** Una foto por cada espacio (sin tope): la marcada por el supervisor si existe; si no, una al azar. */
export function unaFotoPorEspacio(candidatas: any[]): any[] {
  const porEspacio = new Map<string, any[]>();
  candidatas.forEach(foto => porEspacio.set(foto.espacio_nombre, [...(porEspacio.get(foto.espacio_nombre) || []), foto]));
  return Array.from(porEspacio.values()).map(fotos => {
    const marcadas = fotos.filter(foto => foto.usar_en_informe);
    const conjunto = marcadas.length ? marcadas : fotos;
    return conjunto[Math.floor(Math.random() * conjunto.length)];
  });
}

function hoyEcuador(): { anio: number; mes: number; texto: string } {
  const ahora = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return { anio: ahora.getUTCFullYear(), mes: ahora.getUTCMonth() + 1, texto: ahora.toISOString().slice(0, 10) };
}

export async function datosInformeLiderPlantilla(sql: Sql, params: { anio: number; numero: 1 | 2 }) {
  const periodoProyecto = construirPeriodo(params.anio, params.numero);
  const hoy = hoyEcuador();
  const hastaCorte = hoy.texto < periodoProyecto.hasta ? hoy.texto : periodoProyecto.hasta;
  const desde = periodoProyecto.desde;
  const mesesPeriodo = Array.from({ length: periodoProyecto.mesFin - periodoProyecto.mesInicio + 1 }, (_, indice) => periodoProyecto.mesInicio + indice);
  const mesCorte = Number(hastaCorte.slice(5, 7));

  const [proyecto] = await sql`
    SELECT id, nombre_oficial, codigo, unidad_academica, carrera, entidad_beneficiaria, zona, parroquia, ods, linea_investigacion,
           to_char(vigencia_inicio, 'DD/MM/YYYY') AS vigencia_inicio, to_char(vigencia_fin, 'DD/MM/YYYY') AS vigencia_fin,
           codigo_documento_lider, revision_documento_lider, lider_id, lider_email, lider_nombre, firmante_responsable_id
    FROM proyectos WHERE id = 'vinculacion'
  `;
  const [lider] = await sql`
    SELECT id, nombres, apellidos FROM usuarios
    WHERE id = ${proyecto?.lider_id ?? 0} OR (${proyecto?.lider_email ?? ''} <> '' AND email = ${proyecto?.lider_email ?? ''})
    LIMIT 1
  `;
  const [firmante] = proyecto?.firmante_responsable_id
    ? await sql`SELECT nombres, apellidos FROM usuarios WHERE id = ${proyecto.firmante_responsable_id}`
    : [null];
  const [ciclo] = await sql`SELECT id, nombre FROM ciclos_academicos WHERE nombre = ${periodoProyecto.etiqueta}`;

  const espacios = await sql`SELECT id, nombre, categoria, profesor_id FROM "espacios_enseñanza" WHERE area = 'vinculacion'`;
  const espaciosIds: number[] = espacios.map((espacio: any) => espacio.id);
  const idsConsulta = espaciosIds.length ? espaciosIds : [0];
  const instructores = await sql`SELECT DISTINCT usuario_id FROM espacio_instructores WHERE espacio_id = ANY(${idsConsulta})`;
  const contexto: ContextoSupervisor = {
    supervisorId: 0,
    espaciosClubIds: espacios.filter((espacio: any) => espacio.categoria === 'club').map((espacio: any) => espacio.id),
    espaciosInvestigacionIds: espacios.filter((espacio: any) => espacio.categoria === 'investigacion').map((espacio: any) => espacio.id),
    pasantesIds: instructores.map((fila: any) => fila.usuario_id),
    docentesIds: Array.from(new Set(espacios.map((espacio: any) => espacio.profesor_id).filter(Boolean))) as number[],
  };

  // Plan del periodo (marco lógico) con su objetivo.
  const plan = ciclo
    ? await sql`
        SELECT a.id, a.actividad, a.metodologia, a.meta_cantidad::float AS meta, a.unidad, a.fuente,
               to_char(a.mes_inicio, 'MM')::int AS mes_inicio, to_char(a.mes_fin, 'MM')::int AS mes_fin, o.texto AS objetivo
        FROM proyecto_actividades_plan a
        JOIN proyecto_objetivos o ON o.id = a.objetivo_id
        WHERE a.activo = true AND a.ciclo_id = ${ciclo.id}
        ORDER BY a.actividad ASC
      `
    : [];

  const tareas: TareaLider[] = await Promise.all(
    plan.map(async (actividad: any) => {
      const acumulado = await registrosPorFuente(sql, actividad.fuente, contexto, desde, hastaCorte);
      const ejecucionPorMes: Record<number, boolean> = {};
      await Promise.all(
        mesesPeriodo.filter(mesPeriodo => mesPeriodo <= mesCorte).map(async mesPeriodo => {
          const desdeMes = `${params.anio}-${dosDigitos(mesPeriodo)}-01`;
          const hastaMes = `${params.anio}-${dosDigitos(mesPeriodo)}-${dosDigitos(new Date(params.anio, mesPeriodo, 0).getDate())}`;
          const delMes = await registrosPorFuente(sql, actividad.fuente, contexto, desdeMes, hastaMes);
          ejecucionPorMes[mesPeriodo] = (delMes.cantidad ?? 0) > 0 || delMes.sesiones > 0;
        })
      );
      const codigo = /^(\d+\.\d+)/.exec(actividad.actividad)?.[1] ?? '';
      const avance = acumulado.cantidad != null && actividad.meta > 0 ? Math.min(100, Math.round((acumulado.cantidad / actividad.meta) * 100)) : null;
      return {
        codigo,
        nombre: String(actividad.actividad).split(' Meta:')[0].replace(/^\d+\.\d+\s*/, '').trim(),
        meta: actividad.meta,
        unidad: actividad.unidad || '',
        fuente: actividad.fuente,
        realizado: acumulado.cantidad,
        avance,
        alumnos: acumulado.pasantesIds.length,
        audiencia: acumulado.audiencia ?? 0,
        productos_sociales: '',
        productos_academicos: '',
        observaciones: acumulado.detalle,
        mesInicio: actividad.mes_inicio,
        mesFin: actividad.mes_fin,
        ejecucionPorMes,
        objetivo: String(actividad.objetivo || '').split(' Meta')[0].replace(/^(COMPONENTE \d \([^)]*\)|FIN|PROPÓSITO):\s*/, '').trim(),
        metodologia: actividad.metodologia || '',
        pasantesIds: acumulado.pasantesIds,
      } as TareaLider & { pasantesIds: number[] };
    })
  );

  // Participación: docentes y estudiantes (planificado vs ejecutado) y beneficiarios.
  const metas = ciclo
    ? (await sql`SELECT meta_estudiantes, meta_docentes, meta_beneficiarios_directos, meta_beneficiarios_indirectos FROM proyecto_metas_ciclo WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${ciclo.id}`)[0] || {}
    : {};
  const docentesEjecutados = await sql`
    SELECT COUNT(DISTINCT e.profesor_id)::int AS total
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE e.area = 'vinculacion' AND a.estado_aprobacion = 'aprobado' AND a.fecha BETWEEN ${desde}::date AND ${hastaCorte}::date
  `;
  const estudiantesEjecutados = new Set<number>();
  tareas.forEach(tarea => ((tarea as any).pasantesIds as number[]).forEach(id => estudiantesEjecutados.add(id)));

  const [beneficiarios] = await sql`SELECT COUNT(DISTINCT ie.beneficiario_id)::int AS total FROM inscripciones_espacio ie WHERE ie.espacio_id = ANY(${idsConsulta})`;
  const generoFilas = await sql`
    SELECT u.genero, COUNT(DISTINCT u.id)::int AS cantidad FROM inscripciones_espacio ie
    JOIN usuarios u ON ie.beneficiario_id = u.id WHERE ie.espacio_id = ANY(${idsConsulta}) GROUP BY u.genero
  `;
  const edadFilas = await sql`
    SELECT pb.edad FROM inscripciones_espacio ie JOIN perfiles_beneficiarios pb ON ie.beneficiario_id = pb.usuario_id
    WHERE ie.espacio_id = ANY(${idsConsulta})
  `;
  const genero: Record<string, number> = { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0 };
  generoFilas.forEach((fila: any) => { const clave = fila.genero || 'prefiero_no_decir'; genero[clave] = (genero[clave] || 0) + fila.cantidad; });
  const edad: Record<string, number> = { '<18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '>50': 0, 'Sin dato': 0 };
  edadFilas.forEach((fila: any) => { const rango = clasificarRangoEdad(fila.edad); edad[rango] = (edad[rango] || 0) + 1; });
  const beneficiariosIndirectos = tareas.filter(tarea => tarea.fuente === 'podcast' || tarea.fuente === 'evento').reduce((total, tarea) => total + tarea.audiencia, 0);

  const presupuesto = ciclo
    ? await sql`
        SELECT cedula_presupuestaria AS cedula, concepto, COALESCE(solicitado, 0)::float AS solicitado, COALESCE(ejecutado, 0)::float AS ejecutado,
               CASE WHEN COALESCE(solicitado, 0) > 0 THEN ROUND((COALESCE(ejecutado, 0) / solicitado * 100)::numeric, 1)::float ELSE 0 END AS porcentaje,
               (SELECT nombres || ' ' || apellidos FROM usuarios u WHERE u.id = responsable_id) AS responsable
        FROM proyecto_presupuesto WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${ciclo.id} ORDER BY id
      `
    : [];

  // Árbol de problemas.
  const arbolFilas = await sql`SELECT id, nivel, padre_id, texto, orden FROM proyecto_arbol_problemas WHERE proyecto_id = 'vinculacion' AND activo = true ORDER BY orden, id`;
  const causas = arbolFilas.filter((fila: any) => fila.nivel === 'causa_directa').map((causa: any) => ({
    id: causa.id,
    texto: causa.texto,
    indirectas: arbolFilas.filter((fila: any) => fila.nivel === 'causa_indirecta' && fila.padre_id === causa.id).map((fila: any) => fila.texto),
  }));
  const arbol = {
    central: arbolFilas.find((fila: any) => fila.nivel === 'central')?.texto || '',
    causas,
    efectos: arbolFilas.filter((fila: any) => fila.nivel === 'efecto_directo').map((fila: any) => fila.texto),
    efecto_final: arbolFilas.find((fila: any) => fila.nivel === 'efecto_final')?.texto || '',
  };

  // Textos guardados del ciclo (si el líder ya los redactó o los guardó antes).
  const textosFilas = ciclo ? await sql`SELECT clave, texto FROM proyecto_textos_ciclo WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${ciclo.id}` : [];
  const textos: Record<string, string> = {};
  textosFilas.forEach((fila: any) => { textos[fila.clave] = fila.texto; });
  let problemaResultados: ProblemaResultado[] = causas.map((causa: any) => ({ causa: causa.texto, resultados: '', aporte_ensenanza: '', aporte_metas: '' }));
  try {
    const guardados = JSON.parse(textos.problema_resultados || '[]') as ProblemaResultado[];
    if (Array.isArray(guardados) && guardados.length) {
      problemaResultados = problemaResultados.map((base, indice) => ({ ...base, ...(guardados[indice] || {}), causa: base.causa }));
    }
  } catch { /* texto guardado inválido: se ignora */ }

  const obstaculos = await sql`
    SELECT o.restriccion AS descripcion, o.accion_correctiva AS recomendacion, u.nombres || ' ' || u.apellidos AS supervisor
    FROM supervision_obstaculos o JOIN usuarios u ON u.id = o.supervisor_id
    WHERE o.mes BETWEEN ${desde}::date AND ${hastaCorte}::date ORDER BY o.mes
  `;
  const [mcer] = await sql`
    SELECT COUNT(DISTINCT beneficiario_id) FILTER (WHERE tipo = 'inicial')::int AS pretests,
           COUNT(DISTINCT beneficiario_id) FILTER (WHERE tipo = 'final')::int AS postests
    FROM evaluaciones_mcer
  `;
  const fotosCandidatas = await sql`
    SELECT a.foto_url AS url, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, e.nombre AS espacio_nombre, a.usar_en_informe,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS num_beneficiarios,
           (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS num_pasantes
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE e.area = 'vinculacion' AND a.estado_aprobacion = 'aprobado' AND a.foto_url IS NOT NULL
      AND NOT foto_descartada(a.foto_url)
      AND a.fecha BETWEEN ${desde}::date AND ${hastaCorte}::date
  `;

  // Adjuntos: lista de docentes (supervisores y líder), estudiantes y beneficiarios que participaron.
  const idsDocentes = Array.from(new Set([...(contexto.docentesIds || []), ...(lider?.id ? [lider.id] : [])]));
  const docentesFilas = idsDocentes.length
    ? await sql`SELECT id, nombres, apellidos FROM usuarios WHERE id = ANY(${idsDocentes}) ORDER BY apellidos, nombres`
    : [];
  const idsEstudiantes = estudiantesEjecutados.size ? Array.from(estudiantesEjecutados) : contexto.pasantesIds;
  const estudiantesFilas = idsEstudiantes.length
    ? await sql`SELECT id, nombres, apellidos FROM usuarios WHERE id = ANY(${idsEstudiantes}) ORDER BY apellidos, nombres`
    : [];
  const beneficiariosFilas = await sql`
    SELECT u.id, u.nombres, u.apellidos, string_agg(DISTINCT e.nombre, ', ') AS espacios
    FROM inscripciones_espacio ie
    JOIN usuarios u ON u.id = ie.beneficiario_id
    JOIN "espacios_enseñanza" e ON e.id = ie.espacio_id
    WHERE ie.espacio_id = ANY(${idsConsulta})
    GROUP BY u.id, u.nombres, u.apellidos ORDER BY u.apellidos, u.nombres
  `;
  const participantes = {
    docentes: docentesFilas.map((fila: any) => ({
      nombre: tituloNombre(`${fila.apellidos} ${fila.nombres}`),
      rol: [lider?.id === fila.id ? 'Líder del proyecto' : '', (contexto.docentesIds || []).includes(fila.id) ? 'Supervisor' : ''].filter(Boolean).join(' y '),
    })),
    estudiantes: estudiantesFilas.map((fila: any) => tituloNombre(`${fila.apellidos} ${fila.nombres}`)),
    beneficiarios: beneficiariosFilas.map((fila: any) => ({ nombre: tituloNombre(`${fila.apellidos} ${fila.nombres}`), espacio: fila.espacios || '' })),
  };

  const nombrePersona = (fila: any) => (fila ? `${fila.nombres} ${fila.apellidos}` : '');
  return {
    periodo: {
      anio: params.anio,
      numero: params.numero,
      etiqueta: periodoProyecto.etiqueta,
      etiquetaLarga: `Periodo ${periodoProyecto.etiqueta} (${NOMBRES_MESES[periodoProyecto.mesInicio - 1]} a ${NOMBRES_MESES[periodoProyecto.mesFin - 1]} ${params.anio})`,
      desde,
      hasta: hastaCorte,
      mesesPeriodo,
      cicloId: ciclo?.id ?? null,
    },
    general: {
      facultad: (proyecto?.unidad_academica || 'Facultad de Educación y Turismo').replace(/^Facultad de /i, ''),
      proyecto_nombre: proyecto?.nombre_oficial || '',
      proyecto_codigo: proyecto?.codigo || '',
      unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación y Turismo',
      carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      lider_nombre: nombrePersona(lider) || proyecto?.lider_nombre || '',
      vigencia: proyecto?.vigencia_inicio && proyecto?.vigencia_fin ? `${proyecto.vigencia_inicio} - ${proyecto.vigencia_fin}` : '',
      entidad_beneficiaria: proyecto?.entidad_beneficiaria || '',
      ods: proyecto?.ods || '',
      linea_investigacion: proyecto?.linea_investigacion || '',
      zona: proyecto?.zona || '',
      parroquia: proyecto?.parroquia || '',
      codigo_documento: proyecto?.codigo_documento_lider || '',
      revision_documento: proyecto?.revision_documento_lider || '',
      firmante_nombre: nombrePersona(firmante),
      fecha_texto: `${NOMBRES_MESES[hoy.mes - 1].toUpperCase()} DE ${hoy.anio}`,
      beneficiarios_directos: beneficiarios?.total || 0,
      beneficiarios_indirectos: beneficiariosIndirectos,
    },
    tareas: tareas.map(tarea => { const { pasantesIds: _omitido, ...resto } = tarea as any; return resto as TareaLider; }),
    participacion: {
      docentes: { planificados: Number(metas.meta_docentes || 0), ejecutados: docentesEjecutados[0]?.total || 0 },
      estudiantes: { planificados: Number(metas.meta_estudiantes || 0), ejecutados: estudiantesEjecutados.size },
      beneficiarios_directos: beneficiarios?.total || 0,
      beneficiarios_indirectos: beneficiariosIndirectos,
      genero,
      edad,
    },
    presupuesto,
    arbol,
    problemaResultados,
    textos: {
      nuevos_problemas: textos.nuevos_problemas || '',
      contribucion_conocimientos: textos.contribucion_conocimientos || '',
      mejora_oferta: textos.mejora_oferta || '',
      aporte_proyectos: textos.aporte_proyectos || '',
    },
    mcer: { pretests: mcer?.pretests || 0, postests: mcer?.postests || 0, meta_participantes: 100 },
    obstaculos,
    fotos: unaFotoPorEspacio(fotosCandidatas),
    participantes,
  };
}
