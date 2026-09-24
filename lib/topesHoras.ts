// Topes de horas por pasante y tipo de actividad (Sesión 50). Se editan en /vinculacion/topes-horas
// (líder de Vinculación / superadmin) y se guardan en topes_horas_pasante.
// Semántica de cada tope: null = sin tope propio (solo limita la meta total), 0 = tipo no habilitado
// para ese pasante, número = límite DURO de horas de ese tipo. En informes nunca cuenta más que meta.

export type TipoHoras = 'asistencia' | 'autonomas' | 'investigacion' | 'podcast';

export const TIPOS_HORAS: { id: TipoHoras; etiqueta: string }[] = [
  { id: 'asistencia', etiqueta: 'Clubes (asistencia)' },
  { id: 'autonomas', etiqueta: 'Planificación' },
  { id: 'investigacion', etiqueta: 'Investigación' },
  { id: 'podcast', etiqueta: 'Podcast' },
];

export interface TopesPasante {
  asistencia: number | null;
  autonomas: number | null;
  investigacion: number | null;
  podcast: number | null;
  meta: number;
}

export type HorasPorTipo = Record<TipoHoras, number>;

export const META_HORAS_POR_DEFECTO = 96;

// Perfil sin fila propia: planificación con el tope histórico de 16 h y el resto libre bajo la meta.
export const TOPES_POR_DEFECTO: TopesPasante = {
  asistencia: null,
  autonomas: 16,
  investigacion: null,
  podcast: null,
  meta: META_HORAS_POR_DEFECTO,
};

// Pasantes de podcast: todas sus horas cuentan en podcast (96 h), sin planificación/clubes/investigación.
export const TOPES_SOLO_PODCAST: TopesPasante = {
  asistencia: 0,
  autonomas: 0,
  investigacion: 0,
  podcast: META_HORAS_POR_DEFECTO,
  meta: META_HORAS_POR_DEFECTO,
};

// Perfil que aplica a un pasante SIN fila propia en topes_horas_pasante: con el módulo `subir_video`
// (pasante de podcast, actuales y futuras) es "Solo Podcast"; el resto, el perfil general.
export function topesPorDefectoSegunModulos(modulos: string[] | null | undefined): TopesPasante {
  return modulos?.includes('subir_video') ? { ...TOPES_SOLO_PODCAST } : { ...TOPES_POR_DEFECTO };
}

// Atajos de la tabla de gestión.
export const PERFILES_TOPES: { id: string; etiqueta: string; topes: TopesPasante }[] = [
  { id: 'clubes_planificacion', etiqueta: 'Clubes 80 h + Planificación 16 h', topes: { asistencia: 80, autonomas: 16, investigacion: 0, podcast: 0, meta: 96 } },
  { id: 'investigacion_clubes', etiqueta: 'Investigación 20 h + Planificación 16 h + Clubes 60 h', topes: { asistencia: 60, autonomas: 16, investigacion: 20, podcast: 0, meta: 96 } },
  { id: 'solo_podcast', etiqueta: 'Solo Podcast (96 h)', topes: TOPES_SOLO_PODCAST },
  { id: 'por_defecto', etiqueta: 'Por defecto (96 h, Planificación 16 h)', topes: TOPES_POR_DEFECTO },
];

const aNumeroONulo = (valor: any): number | null => (valor === null || valor === undefined ? null : Number(valor));

export async function obtenerTopes(sql: any, usuarioId: number): Promise<TopesPasante> {
  const [fila] = await sql`SELECT * FROM topes_horas_pasante WHERE usuario_id = ${usuarioId}`;
  if (!fila) {
    const [usuario] = await sql`SELECT modulos_acceso FROM usuarios WHERE id = ${usuarioId}`;
    return topesPorDefectoSegunModulos(usuario?.modulos_acceso);
  }
  return {
    asistencia: aNumeroONulo(fila.tope_asistencia),
    autonomas: aNumeroONulo(fila.tope_autonomas),
    investigacion: aNumeroONulo(fila.tope_investigacion),
    podcast: aNumeroONulo(fila.tope_podcast),
    meta: Number(fila.meta_total),
  };
}

// Horas del pasante por tipo: aprobadas (acreditadas) y pendientes (registradas sin aprobar).
export async function obtenerHorasPorTipo(sql: any, usuarioId: number): Promise<{ aprobadas: HorasPorTipo; pendientes: HorasPorTipo }> {
  const [fila] = await sql`
    SELECT
      COALESCE((SELECT SUM(horas) FROM horas_asistencia_instructor WHERE usuario_id = ${usuarioId}), 0)::float AS asistencia_aprobadas,
      COALESCE((SELECT SUM(horas) FROM actividades_autonomas_pasante WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'aprobado'), 0)::float AS autonomas_aprobadas,
      COALESCE((SELECT SUM(horas) FROM actividades_autonomas_pasante WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'pendiente'), 0)::float AS autonomas_pendientes,
      COALESCE((SELECT SUM(horas) FROM actividades_investigacion_pasante WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'aprobado'), 0)::float AS investigacion_aprobadas,
      COALESCE((SELECT SUM(horas) FROM actividades_investigacion_pasante WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'pendiente'), 0)::float AS investigacion_pendientes,
      COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'aprobado'), 0)::float AS podcast_aprobadas,
      COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'pendiente'), 0)::float AS podcast_pendientes
  `;
  return {
    aprobadas: {
      asistencia: fila.asistencia_aprobadas,
      autonomas: fila.autonomas_aprobadas,
      investigacion: fila.investigacion_aprobadas,
      podcast: fila.podcast_aprobadas,
    },
    pendientes: {
      asistencia: 0,
      autonomas: fila.autonomas_pendientes,
      investigacion: fila.investigacion_pendientes,
      podcast: fila.podcast_pendientes,
    },
  };
}

// Horas que cuentan en informes: cada tipo hasta su tope, y el total nunca pasa de la meta.
export function horasContables(aprobadas: HorasPorTipo, topes: TopesPasante) {
  const porTipo = {} as HorasPorTipo;
  let suma = 0;
  for (const { id } of TIPOS_HORAS) {
    const tope = topes[id];
    porTipo[id] = tope === null ? aprobadas[id] : Math.min(aprobadas[id], tope);
    suma += porTipo[id];
  }
  return { porTipo, total: Math.min(suma, topes.meta) };
}

// Aviso (no bloqueante) cuando la suma de topes no cuadra con la meta.
export function avisoSumaTopes(topes: TopesPasante): string | null {
  if (TIPOS_HORAS.some(({ id }) => topes[id] === null)) return null; // hay tipos "libres": no se puede comparar
  const suma = TIPOS_HORAS.reduce((total, { id }) => total + (topes[id] as number), 0);
  if (suma === topes.meta) return null;
  return suma < topes.meta
    ? `Los topes suman ${suma} h, ${topes.meta - suma} h menos que la meta (${topes.meta} h): no alcanzará la meta.`
    : `Los topes suman ${suma} h, ${suma - topes.meta} h más que la meta (${topes.meta} h): en informes solo contarán ${topes.meta} h.`;
}

// Cupo para registrar/aprobar horas de un tipo. Límite duro: si el tope es 0 el tipo no está
// habilitado; si horasNuevas no cabe, permitido = false. incluirPendientes = true al REGISTRAR
// (lo pendiente ya ocupa cupo); false al APROBAR (se compara contra lo ya acreditado).
export async function verificarCupo(
  sql: any,
  usuarioId: number,
  tipo: TipoHoras,
  horasNuevas: number,
  { incluirPendientes }: { incluirPendientes: boolean }
): Promise<{ permitido: boolean; tope: number | null; disponibles: number | null; mensaje?: string }> {
  const [topes, horas] = await Promise.all([obtenerTopes(sql, usuarioId), obtenerHorasPorTipo(sql, usuarioId)]);
  const tope = topes[tipo];
  if (tope === null) return { permitido: true, tope: null, disponibles: null };
  const usadas = horas.aprobadas[tipo] + (incluirPendientes ? horas.pendientes[tipo] : 0);
  const disponibles = Math.max(0, Math.round((tope - usadas) * 100) / 100);
  const etiqueta = TIPOS_HORAS.find(t => t.id === tipo)!.etiqueta;
  if (tope === 0) {
    return { permitido: false, tope, disponibles: 0, mensaje: `El tipo "${etiqueta}" no está habilitado para este pasante.` };
  }
  if (horasNuevas > disponibles) {
    return { permitido: false, tope, disponibles, mensaje: `Supera el tope de ${tope} h de "${etiqueta}". Quedan ${disponibles} h disponibles.` };
  }
  return { permitido: true, tope, disponibles };
}
