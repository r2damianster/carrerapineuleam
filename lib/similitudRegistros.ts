// lib/similitudRegistros.ts
// Motor de similitud reusable para detectar registros probablemente duplicados
// ANTES de guardar (asistencia, difusión de eventos/podcast, alta de beneficiario).
// Sin dependencias externas — el repo no trae ninguna librería de fuzzy-matching.
//
// Umbrales de uso (fijados por decisión del usuario, no configurables desde la UI):
//   >= 90% => bloqueo total, nunca se guarda.
//   >= 70% => aviso, requiere confirmación explícita para guardar.
//   <  70% => se guarda sin fricción.

export type TipoComparable = 'asistencia' | 'difusion' | 'beneficiario';

export interface ResultadoSimilitud {
  porcentaje: number;
  candidatoId: number;
  detalle: Record<string, number>;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = Array.from({ length: filas }, () => new Array(columnas).fill(0));
  for (let i = 0; i < filas; i++) matriz[i][0] = i;
  for (let j = 0; j < columnas; j++) matriz[0][j] = j;
  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo
      );
    }
  }
  return matriz[filas - 1][columnas - 1];
}

// Similitud de texto libre (títulos, nombres) → 0-100.
export function similitudTexto(a: string, b: string): number {
  const normA = normalizarTexto(a || '');
  const normB = normalizarTexto(b || '');
  if (!normA && !normB) return 100;
  if (!normA || !normB) return 0;
  const distancia = distanciaLevenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return Math.round((1 - distancia / maxLen) * 100);
}

function unicos(valores: number[]): number[] {
  return valores.filter((valor, indice) => valores.indexOf(valor) === indice);
}

// Índice de Jaccard entre dos conjuntos de ids → 0-100.
export function similitudConjuntos(a: number[], b: number[]): number {
  const unicoA = unicos(a);
  const unicoB = unicos(b);
  if (unicoA.length === 0 && unicoB.length === 0) return 100;
  const setB = new Set(unicoB);
  const interseccion = unicoA.filter((id) => setB.has(id)).length;
  const union = unicos(unicoA.concat(unicoB)).length;
  return union === 0 ? 100 : Math.round((interseccion / union) * 100);
}

function minutosDesdeMedianoche(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + (minutos || 0);
}

// Proporción del rango horario que se solapa respecto a la unión de ambos rangos → 0-100.
function similitudHorario(aInicio: string, aFin: string, bInicio: string, bFin: string): number {
  const aIni = minutosDesdeMedianoche(aInicio);
  const aFn = minutosDesdeMedianoche(aFin);
  const bIni = minutosDesdeMedianoche(bInicio);
  const bFn = minutosDesdeMedianoche(bFin);
  const solapado = Math.max(0, Math.min(aFn, bFn) - Math.max(aIni, bIni));
  const union = Math.max(aFn, bFn) - Math.min(aIni, bIni);
  return union <= 0 ? 100 : Math.round((solapado / union) * 100);
}

// Promedia pares [peso, valor|null] descartando los que vienen sin dato (null) y
// redistribuyendo su peso entre los demás — así un campo ausente en cualquiera de
// los dos registros no penaliza artificialmente la similitud.
function promedioPonderado(pares: Array<[number, number | null]>): { total: number; detalle: number[] } {
  const validos = pares.filter(([, valor]) => valor !== null) as Array<[number, number]>;
  const pesoTotal = validos.reduce((suma, [peso]) => suma + peso, 0);
  if (pesoTotal === 0) return { total: 0, detalle: pares.map(() => 0) };
  const total = validos.reduce((suma, [peso, valor]) => suma + (peso / pesoTotal) * valor, 0);
  return { total: Math.round(total), detalle: pares.map(([, valor]) => valor ?? 0) };
}

// ---------- Asistencia ----------

export interface AsistenciaComparable {
  id: number;
  espacioId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  beneficiarios: number[];
  personalApoyo: number[]; // titulares + invitados
}

export function similitudAsistencia(
  nuevo: Omit<AsistenciaComparable, 'id'>,
  candidato: AsistenciaComparable
): number {
  const { total } = promedioPonderado([
    [60, similitudConjuntos(nuevo.beneficiarios, candidato.beneficiarios)],
    [20, similitudConjuntos(nuevo.personalApoyo, candidato.personalApoyo)],
    [20, similitudHorario(nuevo.horaInicio, nuevo.horaFin, candidato.horaInicio, candidato.horaFin)],
  ]);
  return total;
}

// ---------- Difusión (eventos/podcast) ----------

export interface DifusionComparable {
  id: number;
  titulo: string;
  tipo: string;
  categoria: string;
  hora: string | null;
  proyectos: string[];
  profesoresResponsables: number[];
}

function jaccardTexto(a: string[], b: string[]): number {
  return similitudConjuntos(
    a.map((valor) => hashTexto(valor)),
    b.map((valor) => hashTexto(valor))
  );
}
// Los proyectos son strings (slugs) — se mapean a un número estable solo para reusar similitudConjuntos.
function hashTexto(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  return hash;
}

export function similitudDifusion(
  nuevo: Omit<DifusionComparable, 'id'>,
  candidato: DifusionComparable
): number {
  const horaComparable = nuevo.hora && candidato.hora
    ? (Math.abs(minutosDesdeMedianoche(nuevo.hora) - minutosDesdeMedianoche(candidato.hora)) <= 30 ? 100 : 0)
    : null;
  const { total } = promedioPonderado([
    [35, similitudTexto(nuevo.titulo, candidato.titulo)],
    [15, nuevo.tipo === candidato.tipo ? 100 : 0],
    [10, nuevo.categoria === candidato.categoria ? 100 : 0],
    [15, jaccardTexto(nuevo.proyectos, candidato.proyectos)],
    [15, similitudConjuntos(nuevo.profesoresResponsables, candidato.profesoresResponsables)],
    [10, horaComparable],
  ]);
  return total;
}

// ---------- Beneficiario ----------

export interface BeneficiarioComparable {
  id: number;
  nombreCompleto: string;
  edad: number | null;
  email: string | null;
  espacioId: number | null;
}

function emailComparable(email: string | null): string | null {
  if (!email) return null;
  return email.endsWith('@sin-email.pine') ? null : email.toLowerCase();
}

export function similitudBeneficiario(
  nuevo: Omit<BeneficiarioComparable, 'id'>,
  candidato: BeneficiarioComparable
): number {
  const emailNuevo = emailComparable(nuevo.email);
  const emailCandidato = emailComparable(candidato.email);
  const { total } = promedioPonderado([
    [50, similitudTexto(nuevo.nombreCompleto, candidato.nombreCompleto)],
    [15, nuevo.edad !== null && candidato.edad !== null ? (nuevo.edad === candidato.edad ? 100 : 0) : null],
    [20, emailNuevo && emailCandidato ? (emailNuevo === emailCandidato ? 100 : 0) : null],
    [15, nuevo.espacioId !== null && candidato.espacioId !== null ? (nuevo.espacioId === candidato.espacioId ? 100 : 0) : null],
  ]);
  return total;
}

// ---------- Búsqueda de candidatos en Neon ----------

// `sql` es el cliente de @neondatabase/serverless (tagged template), tipado `any`
// para poder pasarlo entre módulos sin acoplar este archivo a esa dependencia.
export async function buscarMasParecidoAsistencia(
  sql: any,
  nuevo: Omit<AsistenciaComparable, 'id'>
): Promise<ResultadoSimilitud | null> {
  const filas = await sql`
    SELECT ae.id, ae.hora_inicio, ae.hora_fin,
      COALESCE(array_agg(DISTINCT ab.beneficiario_id) FILTER (WHERE ab.beneficiario_id IS NOT NULL), '{}') AS beneficiarios,
      COALESCE(array_agg(DISTINCT ai.usuario_id) FILTER (WHERE ai.usuario_id IS NOT NULL), '{}') AS personal_apoyo
    FROM asistencia_espacio ae
    LEFT JOIN asistencia_beneficiarios ab ON ab.asistencia_id = ae.id
    LEFT JOIN asistencia_instructores ai ON ai.asistencia_id = ae.id
    WHERE ae.espacio_id = ${nuevo.espacioId} AND ae.fecha = ${nuevo.fecha} AND ae.estado_aprobacion <> 'rechazado'
    GROUP BY ae.id, ae.hora_inicio, ae.hora_fin
  `;
  let mejor: ResultadoSimilitud | null = null;
  for (const fila of filas) {
    const candidato: AsistenciaComparable = {
      id: Number(fila.id),
      espacioId: nuevo.espacioId,
      fecha: nuevo.fecha,
      horaInicio: String(fila.hora_inicio).slice(0, 5),
      horaFin: String(fila.hora_fin).slice(0, 5),
      beneficiarios: (fila.beneficiarios ?? []).map(Number),
      personalApoyo: (fila.personal_apoyo ?? []).map(Number),
    };
    const porcentaje = similitudAsistencia(nuevo, candidato);
    if (!mejor || porcentaje > mejor.porcentaje) {
      mejor = { porcentaje, candidatoId: candidato.id, detalle: {} };
    }
  }
  return mejor;
}

export async function buscarMasParecidoDifusion(
  sql: any,
  nuevo: Omit<DifusionComparable, 'id'>,
  fecha: string
): Promise<ResultadoSimilitud | null> {
  const filas = await sql`
    SELECT id, titulo, tipo, categoria, hora, proyectos, profesores_responsables
    FROM actividades_difusion
    WHERE fecha = ${fecha}
  `;
  let mejor: ResultadoSimilitud | null = null;
  for (const fila of filas) {
    const candidato: DifusionComparable = {
      id: Number(fila.id),
      titulo: fila.titulo ?? '',
      tipo: fila.tipo ?? '',
      categoria: fila.categoria ?? '',
      hora: fila.hora ? String(fila.hora).slice(0, 5) : null,
      proyectos: fila.proyectos ?? [],
      profesoresResponsables: (fila.profesores_responsables ?? []).map(Number),
    };
    const porcentaje = similitudDifusion(nuevo, candidato);
    if (!mejor || porcentaje > mejor.porcentaje) {
      mejor = { porcentaje, candidatoId: candidato.id, detalle: {} };
    }
  }
  return mejor;
}

// ---------- Umbrales y gate compartido ----------

export const UMBRAL_AVISO_SIMILITUD = 70;
export const UMBRAL_BLOQUEO_SIMILITUD = 90;

export type CodigoGateSimilitud = 'OK' | 'REQUIERE_CONFIRMACION' | 'DUPLICADO_BLOQUEADO';

// Un solo lugar que decide qué hacer con un resultado de similitud, para que el endpoint
// de verificación previa y el POST de guardado real apliquen exactamente el mismo criterio.
export function evaluarGateSimilitud(similitud: ResultadoSimilitud | null, confirmado: boolean): CodigoGateSimilitud {
  if (!similitud) return 'OK';
  if (similitud.porcentaje >= UMBRAL_BLOQUEO_SIMILITUD) return 'DUPLICADO_BLOQUEADO';
  if (similitud.porcentaje >= UMBRAL_AVISO_SIMILITUD && !confirmado) return 'REQUIERE_CONFIRMACION';
  return 'OK';
}

// ---------- Concurrencia de beneficiario entre espacios (punto 3: bloqueo, no aviso) ----------

export interface ConflictoConcurrencia {
  beneficiarioId: number;
  nombre: string;
  espacioNombre: string;
  asistenciaId: number;
  horaInicio: string;
  horaFin: string;
}

// Un beneficiario no puede quedar marcado presente en dos espacios distintos el mismo día
// con un margen de menos de 2h entre sesiones — a diferencia del aviso de similitud, esto
// SIEMPRE bloquea (nunca hay `confirmado` que lo pase por alto).
export async function buscarConflictosConcurrenciaAsistencia(
  sql: any,
  datos: { espacioId: number; fecha: string; horaInicio: string; horaFin: string; beneficiarios: number[] }
): Promise<ConflictoConcurrencia[]> {
  if (datos.beneficiarios.length === 0) return [];
  const filas = await sql`
    SELECT ab.beneficiario_id, u.nombres, u.apellidos, ae.id AS asistencia_id, e.nombre AS espacio_nombre,
      ae.hora_inicio, ae.hora_fin
    FROM asistencia_espacio ae
    JOIN asistencia_beneficiarios ab ON ab.asistencia_id = ae.id
    JOIN usuarios u ON u.id = ab.beneficiario_id
    JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
    WHERE ae.fecha = ${datos.fecha}
      AND ae.espacio_id <> ${datos.espacioId}
      AND ae.estado_aprobacion <> 'rechazado'
      AND ab.beneficiario_id = ANY(${datos.beneficiarios}::int[])
      AND NOT (${datos.horaFin}::time + make_interval(mins => 120) <= ae.hora_inicio
            OR ae.hora_fin + make_interval(mins => 120) <= ${datos.horaInicio}::time)
  `;
  return filas.map((fila: any) => ({
    beneficiarioId: Number(fila.beneficiario_id),
    nombre: `${fila.nombres} ${fila.apellidos}`,
    espacioNombre: fila.espacio_nombre,
    asistenciaId: Number(fila.asistencia_id),
    horaInicio: String(fila.hora_inicio).slice(0, 5),
    horaFin: String(fila.hora_fin).slice(0, 5),
  }));
}

export async function buscarMasParecidoBeneficiario(
  sql: any,
  nuevo: Omit<BeneficiarioComparable, 'id'>
): Promise<ResultadoSimilitud | null> {
  const filas = await sql`
    SELECT u.id, u.nombres, u.apellidos, pb.edad, u.email, ie.espacio_id
    FROM usuarios u
    JOIN perfiles_beneficiarios pb ON pb.usuario_id = u.id
    LEFT JOIN inscripciones_espacio ie ON ie.beneficiario_id = u.id
    WHERE u.rol = 'beneficiario'
      AND (ie.espacio_id = ${nuevo.espacioId} OR u.creado_en >= now() - interval '90 days')
  `;
  let mejor: ResultadoSimilitud | null = null;
  for (const fila of filas) {
    const candidato: BeneficiarioComparable = {
      id: Number(fila.id),
      nombreCompleto: `${fila.nombres} ${fila.apellidos}`,
      edad: fila.edad !== null && fila.edad !== undefined ? Number(fila.edad) : null,
      email: fila.email ?? null,
      espacioId: fila.espacio_id !== null && fila.espacio_id !== undefined ? Number(fila.espacio_id) : null,
    };
    const porcentaje = similitudBeneficiario(nuevo, candidato);
    if (!mejor || porcentaje > mejor.porcentaje) {
      mejor = { porcentaje, candidatoId: candidato.id, detalle: {} };
    }
  }
  return mejor;
}
