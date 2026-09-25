import { obtenerTopes, obtenerHorasPorTipo, horasContables } from './topesHoras';

export interface ResolverPeriodoParams {
  tipo: 'lider' | 'supervisor';
  cicloId?: number | null;
  mes?: string | null; // Formato 'YYYY-MM' o 'YYYY-MM-DD'
}

export interface PeriodoResuelto {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  etiqueta: string;
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export async function resolverPeriodo(sql: any, params: ResolverPeriodoParams): Promise<PeriodoResuelto> {
  const { tipo, cicloId, mes } = params;

  if (tipo === 'supervisor' && mes) {
    const partes = mes.split('-');
    const ano = parseInt(partes[0], 10);
    const mesNum = parseInt(partes[1], 10);
    const primerDia = `${ano}-${String(mesNum).padStart(2, '0')}-01`;
    const ultimoDiaNum = new Date(ano, mesNum, 0).getDate();
    const ultimoDia = `${ano}-${String(mesNum).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;
    const etiqueta = `${NOMBRES_MESES[mesNum - 1]} ${ano}`;
    return { desde: primerDia, hasta: ultimoDia, etiqueta };
  }

  if (cicloId) {
    const [ciclo] = await sql`
      SELECT id, nombre, fecha_inicio, fecha_fin FROM ciclos_academicos WHERE id = ${cicloId}
    `;
    if (ciclo) {
      const desdeStr = ciclo.fecha_inicio ? new Date(ciclo.fecha_inicio).toISOString().split('T')[0] : '';
      const hastaStr = ciclo.fecha_fin ? new Date(ciclo.fecha_fin).toISOString().split('T')[0] : '';
      return { desde: desdeStr, hasta: hastaStr, etiqueta: ciclo.nombre };
    }
  }

  const hoy = new Date();
  const ano = hoy.getFullYear();
  const mesNum = hoy.getMonth() + 1;
  const primerDia = `${ano}-${String(mesNum).padStart(2, '0')}-01`;
  const ultimoDiaNum = new Date(ano, mesNum, 0).getDate();
  const ultimoDia = `${ano}-${String(mesNum).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;
  return { desde: primerDia, hasta: ultimoDia, etiqueta: `${NOMBRES_MESES[mesNum - 1]} ${ano}` };
}

export function clasificarRangoEdad(edad: number | null | undefined): string {
  if (edad === null || edad === undefined || isNaN(Number(edad)) || Number(edad) <= 0) {
    return 'Sin dato';
  }
  const n = Number(edad);
  if (n < 18) return '<18';
  if (n <= 25) return '18-25';
  if (n <= 35) return '26-35';
  if (n <= 50) return '36-50';
  return '>50';
}

export async function datosInformeSupervisor(sql: any, { supervisorId, mes }: { supervisorId: number; mes: string }) {
  const periodo = await resolverPeriodo(sql, { tipo: 'supervisor', mes });

  // 1. Datos del proyecto y supervisor
  const [proyRows, supRows, espaciosSup] = await Promise.all([
    sql`SELECT * FROM proyectos WHERE id = 'vinculacion'`,
    sql`SELECT id, nombres, apellidos, email, cedula, titulo_grado, post_grado FROM usuarios WHERE id = ${supervisorId}`,
    sql`SELECT id, nombre, tipo, ciclo_id FROM espacios_enseñanza WHERE profesor_id = ${supervisorId}`
  ]);

  const proyecto = proyRows[0] || {};
  const supervisor = supRows[0] || {};
  const espaciosIds = espaciosSup.map((e: any) => e.id);

  if (espaciosIds.length === 0) {
    return {
      general: { proyecto, supervisor, periodo, espacios: [], pasantes_count: 0, beneficiarios_count: 0 },
      tareas: [],
      no_previstas: [],
      participacion: { pasantes: [], generos: { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0, sin_dato: 0 }, edades: {} },
      obstaculos: [],
      fotos: []
    };
  }

  // 2. Consultas en paralelo para los espacios del supervisor
  const [
    pasantesRows,
    beneficiariosRows,
    sesionesAprobadas,
    obstaculosRows,
    fotosRows
  ] = await Promise.all([
    sql`
      SELECT DISTINCT u.id, u.nombres, u.apellidos, u.email, u.modulos_acceso
      FROM espacio_instructores ei
      JOIN usuarios u ON ei.usuario_id = u.id
      WHERE ei.espacio_id = ANY(${espaciosIds})
    `,
    sql`
      SELECT DISTINCT u.id, u.nombres, u.apellidos, u.genero, pb.edad
      FROM inscripciones_espacio ie
      JOIN usuarios u ON ie.beneficiario_id = u.id
      LEFT JOIN perfiles_beneficiarios pb ON u.id = pb.usuario_id
      WHERE ie.espacio_id = ANY(${espaciosIds})
    `,
    sql`
      SELECT a.id, a.espacio_id, e.nombre AS espacio_nombre, a.fecha, a.actividad_plan_id,
             p.actividad AS actividad_nombre, a.no_prevista, a.comentario_supervisor, a.observaciones,
             a.foto_url, a.usar_en_informe,
             COUNT(DISTINCT ab.beneficiario_id)::int AS beneficiarios_count,
             COUNT(DISTINCT ai.usuario_id)::int AS pasantes_count,
             COALESCE(SUM(ha.horas), 0)::float AS horas_acreditadas
      FROM asistencia_espacio a
      JOIN espacios_enseñanza e ON a.espacio_id = e.id
      LEFT JOIN proyecto_actividades_plan p ON a.actividad_plan_id = p.id
      LEFT JOIN asistencia_beneficiarios ab ON a.id = ab.asistencia_id
      LEFT JOIN asistencia_instructores ai ON a.id = ai.asistencia_id
      LEFT JOIN horas_asistencia_instructor ha ON a.id = ha.asistencia_id
      WHERE a.espacio_id = ANY(${espaciosIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.fecha >= ${periodo.desde}::date AND a.fecha <= ${periodo.hasta}::date
      GROUP BY a.id, a.espacio_id, e.nombre, a.fecha, a.actividad_plan_id, p.actividad, a.no_prevista, a.comentario_supervisor, a.observaciones, a.foto_url, a.usar_en_informe
      ORDER BY a.fecha ASC
    `,
    sql`
      SELECT * FROM supervision_obstaculos
      WHERE supervisor_id = ${supervisorId}
        AND mes = ${periodo.desde}::date
      ORDER BY id ASC
    `,
    sql`
      SELECT a.id, a.foto_url, a.fecha, e.nombre AS espacio_nombre, a.observaciones, a.comentario_supervisor,
             COUNT(DISTINCT ab.beneficiario_id)::int AS beneficiarios_count,
             COUNT(DISTINCT ai.usuario_id)::int AS pasantes_count
      FROM asistencia_espacio a
      JOIN espacios_enseñanza e ON a.espacio_id = e.id
      LEFT JOIN asistencia_beneficiarios ab ON a.id = ab.asistencia_id
      LEFT JOIN asistencia_instructores ai ON a.id = ai.asistencia_id
      WHERE a.espacio_id = ANY(${espaciosIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.usar_en_informe = true
        AND a.foto_url IS NOT NULL AND a.foto_url <> ''
        AND a.fecha >= ${periodo.desde}::date AND a.fecha <= ${periodo.hasta}::date
      GROUP BY a.id, a.foto_url, a.fecha, e.nombre, a.observaciones, a.comentario_supervisor
      ORDER BY a.fecha ASC
      LIMIT 12
    `
  ]);

  // Agrupar tareas planificadas vs no previstas
  const tareasMap = new Map<string, any>();
  const noPrevistasMap = new Map<string, any>();

  for (const s of sesionesAprobadas) {
    const key = `${s.espacio_id}_${s.actividad_plan_id || 'sin_plan'}`;
    const targetMap = s.no_prevista ? noPrevistasMap : tareasMap;

    if (!targetMap.has(key)) {
      targetMap.set(key, {
        espacio_id: s.espacio_id,
        espacio_nombre: s.espacio_nombre,
        actividad_plan_id: s.actividad_plan_id,
        actividad_nombre: s.actividad_nombre || (s.no_prevista ? 'Actividad no prevista' : 'Actividad libre'),
        sesiones_aprobadas_count: 0,
        pasantes_count: 0,
        beneficiarios_atendidos_count: 0,
        horas_acreditadas: 0,
        comentarios: []
      });
    }

    const t = targetMap.get(key);
    t.sesiones_aprobadas_count += 1;
    t.pasantes_count = Math.max(t.pasantes_count, s.pasantes_count);
    t.beneficiarios_atendidos_count += s.beneficiarios_count;
    t.horas_acreditadas += s.horas_acreditadas;
    if (s.comentario_supervisor) t.comentarios.push(s.comentario_supervisor);
  }

  // Participación de pasantes con horas contables
  const pasantesParticipacion = await Promise.all(
    pasantesRows.map(async (pasante: any) => {
      const topes = await obtenerTopes(sql, pasante.id);
      const horas = await obtenerHorasPorTipo(sql, pasante.id);
      const contables = horasContables(horas.aprobadas, topes);
      return {
        id: pasante.id,
        nombres: pasante.nombres,
        apellidos: pasante.apellidos,
        email: pasante.email,
        horas_asistencia: horas.aprobadas.asistencia,
        horas_autonomas: horas.aprobadas.autonomas,
        horas_investigacion: horas.aprobadas.investigacion,
        horas_podcast: horas.aprobadas.podcast,
        horas_total_contables: contables.total,
        meta_total: topes.meta,
        porcentaje_meta: Math.round((contables.total / topes.meta) * 100)
      };
    })
  );

  // Desglose de beneficiarios por género y rango de edad
  const generosCount = { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0, sin_dato: 0 };
  const edadesCount: Record<string, number> = { '<18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '>50': 0, 'Sin dato': 0 };

  for (const b of beneficiariosRows) {
    const g = b.genero as keyof typeof generosCount;
    if (g && generosCount[g] !== undefined) {
      generosCount[g]++;
    } else {
      generosCount.sin_dato++;
    }

    const rango = clasificarRangoEdad(b.edad);
    edadesCount[rango] = (edadesCount[rango] || 0) + 1;
  }

  return {
    general: {
      proyecto,
      supervisor,
      periodo,
      espacios: espaciosSup,
      pasantes_count: pasantesRows.length,
      beneficiarios_count: beneficiariosRows.length
    },
    tareas: Array.from(tareasMap.values()),
    no_previstas: Array.from(noPrevistasMap.values()),
    participacion: {
      pasantes: pasantesParticipacion,
      generos: generosCount,
      edades: edadesCount
    },
    obstaculos: obstaculosRows,
    fotos: fotosRows
  };
}

export async function datosInformeLider(sql: any, { cicloId }: { cicloId: number }) {
  const periodo = await resolverPeriodo(sql, { tipo: 'lider', cicloId });

  // 1. Proyecto, metas y textos del ciclo
  const [proyRows, metasRows, textosRows, objetivosRows, presupuestoRows] = await Promise.all([
    sql`SELECT * FROM proyectos WHERE id = 'vinculacion'`,
    sql`SELECT * FROM proyecto_metas_ciclo WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${cicloId}`,
    sql`SELECT clave, texto FROM proyecto_textos_ciclo WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${cicloId}`,
    sql`SELECT * FROM proyecto_objetivos WHERE proyecto_id = 'vinculacion' ORDER BY tipo DESC, orden ASC, id ASC`,
    sql`SELECT * FROM proyecto_presupuesto WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${cicloId} ORDER BY id ASC`
  ]);

  const proyecto = proyRows[0] || {};
  const metasCiclo = metasRows[0] || { meta_estudiantes: 0, meta_docentes: 0, meta_beneficiarios_directos: 0, meta_beneficiarios_indirectos: 0 };
  const textosMap: Record<string, string> = {};
  textosRows.forEach((t: any) => { textosMap[t.clave] = t.texto; });

  // 2. Todos los espacios del ciclo
  const espacios = await sql`
    SELECT e.id, e.nombre, e.profesor_id, u.nombres AS prof_nombres, u.apellidos AS prof_apellidos
    FROM espacios_enseñanza e
    LEFT JOIN usuarios u ON e.profesor_id = u.id
    WHERE e.ciclo_id = ${cicloId} OR e.ciclo_id IS NULL
    ORDER BY e.nombre ASC
  `;
  const espaciosIds = espacios.map((e: any) => e.id);

  if (espaciosIds.length === 0) {
    return {
      general: { proyecto, periodo, metasCiclo, pasantes_count: 0, beneficiarios_count: 0 },
      objetivos_y_plan: [],
      participacion: { pasantes: [], generos: { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0, sin_dato: 0 }, edades: {} },
      mcer: { ganancia: [] },
      satisfaccion: { promedio_global: 0, por_dimension: {}, instructores: [] },
      presupuesto: { items: presupuestoRows, totalSolicitado: 0, totalEjecutado: 0, porcentaje: 0 },
      textos: textosMap,
      fotos: []
    };
  }

  // 3. Consultas agregadas del ciclo
  const [
    actividadesPlan,
    pasantesRows,
    beneficiariosRows,
    mcerRows,
    satisfaccionRows,
    fotosRows
  ] = await Promise.all([
    sql`
      SELECT a.*, COUNT(DISTINCT se.id)::int AS sesiones_ejecutadas_count
      FROM proyecto_actividades_plan a
      LEFT JOIN asistencia_espacio se ON a.id = se.actividad_plan_id AND se.estado_aprobacion = 'aprobado'
      WHERE a.ciclo_id = ${cicloId} OR a.ciclo_id IS NULL
      GROUP BY a.id
      ORDER BY a.id ASC
    `,
    sql`
      SELECT DISTINCT u.id, u.nombres, u.apellidos, u.email, u.modulos_acceso
      FROM espacio_instructores ei
      JOIN usuarios u ON ei.usuario_id = u.id
      WHERE ei.espacio_id = ANY(${espaciosIds})
    `,
    sql`
      SELECT DISTINCT u.id, u.nombres, u.apellidos, u.genero, pb.edad
      FROM inscripciones_espacio ie
      JOIN usuarios u ON ie.beneficiario_id = u.id
      LEFT JOIN perfiles_beneficiarios pb ON u.id = pb.usuario_id
      WHERE ie.espacio_id = ANY(${espaciosIds})
    `,
    sql`
      SELECT beneficiario_id, tipo, subnivel_actual, nota
      FROM evaluaciones_mcer
      WHERE beneficiario_id IN (
        SELECT DISTINCT beneficiario_id FROM inscripciones_espacio WHERE espacio_id = ANY(${espaciosIds})
      )
    `,
    sql`
      SELECT nivel_satisfaccion, aprendizaje, mejora, recursos
      FROM encuestas_satisfaccion
      WHERE ciclo_id = ${cicloId}
    `,
    sql`
      SELECT a.id, a.foto_url, a.fecha, e.nombre AS espacio_nombre, a.observaciones,
             COUNT(DISTINCT ab.beneficiario_id)::int AS beneficiarios_count,
             COUNT(DISTINCT ai.usuario_id)::int AS pasantes_count
      FROM asistencia_espacio a
      JOIN espacios_enseñanza e ON a.espacio_id = e.id
      LEFT JOIN asistencia_beneficiarios ab ON a.id = ab.asistencia_id
      LEFT JOIN asistencia_instructores ai ON a.id = ai.asistencia_id
      WHERE a.espacio_id = ANY(${espaciosIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.usar_en_informe = true
        AND a.foto_url IS NOT NULL AND a.foto_url <> ''
      GROUP BY a.id, a.foto_url, a.fecha, e.nombre, a.observaciones
      ORDER BY a.fecha ASC
      LIMIT 12
    `
  ]);

  // Objetivos estructurados con sus actividades
  const objetivosConActividades = objetivosRows.map((obj: any) => ({
    ...obj,
    actividades: actividadesPlan.filter((act: any) => act.objetivo_id === obj.id)
  }));

  // Pasantes y horas contables acumuladas
  const pasantesParticipacion = await Promise.all(
    pasantesRows.map(async (pasante: any) => {
      const topes = await obtenerTopes(sql, pasante.id);
      const horas = await obtenerHorasPorTipo(sql, pasante.id);
      const contables = horasContables(horas.aprobadas, topes);
      return {
        id: pasante.id,
        nombres: pasante.nombres,
        apellidos: pasante.apellidos,
        email: pasante.email,
        horas_total_contables: contables.total,
        meta_total: topes.meta,
        porcentaje_meta: Math.round((contables.total / topes.meta) * 100)
      };
    })
  );

  // Beneficiarios género y edad
  const generosCount = { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0, sin_dato: 0 };
  const edadesCount: Record<string, number> = { '<18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '>50': 0, 'Sin dato': 0 };

  for (const b of beneficiariosRows) {
    const g = b.genero as keyof typeof generosCount;
    if (g && generosCount[g] !== undefined) {
      generosCount[g]++;
    } else {
      generosCount.sin_dato++;
    }

    const rango = clasificarRangoEdad(b.edad);
    edadesCount[rango] = (edadesCount[rango] || 0) + 1;
  }

  // Presupuesto totales
  let totalSolicitado = 0;
  let totalEjecutado = 0;
  presupuestoRows.forEach((p: any) => {
    totalSolicitado += Number(p.solicitado || 0);
    totalEjecutado += Number(p.ejecutado || 0);
  });
  const pctPresupuesto = totalSolicitado > 0 ? (totalEjecutado / totalSolicitado) * 100 : 0;

  // Promedios de satisfacción
  let sumSat = 0, sumApr = 0, sumMej = 0, sumRec = 0;
  const totalEncuestas = satisfaccionRows.length;
  if (totalEncuestas > 0) {
    satisfaccionRows.forEach((s: any) => {
      sumSat += Number(s.nivel_satisfaccion || 0);
      sumApr += Number(s.aprendizaje || 0);
      sumMej += Number(s.mejora || 0);
      sumRec += Number(s.recursos || 0);
    });
  }

  return {
    general: {
      proyecto,
      periodo,
      metasCiclo,
      pasantes_count: pasantesRows.length,
      beneficiarios_count: beneficiariosRows.length
    },
    objetivos_y_plan: objetivosConActividades,
    participacion: {
      pasantes: pasantesParticipacion,
      generos: generosCount,
      edades: edadesCount
    },
    mcer: { evaluaciones_count: mcerRows.length },
    satisfaccion: {
      total_encuestas: totalEncuestas,
      promedios: totalEncuestas > 0 ? {
        nivel_satisfaccion: Math.round((sumSat / totalEncuestas) * 10) / 10,
        aprendizaje: Math.round((sumApr / totalEncuestas) * 10) / 10,
        mejora: Math.round((sumMej / totalEncuestas) * 10) / 10,
        recursos: Math.round((sumRec / totalEncuestas) * 10) / 10
      } : { nivel_satisfaccion: 0, aprendizaje: 0, mejora: 0, recursos: 0 }
    },
    presupuesto: {
      items: presupuestoRows,
      totalSolicitado,
      totalEjecutado,
      porcentaje: Math.round(pctPresupuesto * 100) / 100
    },
    textos: textosMap,
    fotos: fotosRows
  };
}
