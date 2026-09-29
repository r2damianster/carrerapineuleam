import { formatearFechaLarga } from "./fechas";
import type { Docente } from "./docentes";

/** Igual que formatearFechaLarga: convierte 2026-02-20 en "20 de febrero de 2026". */
export const formatearFechaReunion = formatearFechaLarga;

export interface GrupoConvocado {
  carrera: string;
  asignatura: string;
  paralelo?: string;
  estudiantes: { nombre: string; correo?: string }[];
}

function unirConY(elementos: string[]): string {
  if (elementos.length <= 1) return elementos.join("");
  return `${elementos.slice(0, -1).join(", ")} y ${elementos[elementos.length - 1]}`;
}

function nombreCarrera(carrera: string): string {
  const limpia = carrera.trim();
  return /^carrera/i.test(limpia) ? limpia.replace(/^carrera/i, "Carrera") : `Carrera de ${limpia}`;
}

/**
 * Texto del "PARA:" agrupado por carrera, ej.:
 * "la asignatura Ética Profesional de la Carrera de Educación Básica"
 * "las asignaturas A y B de la Carrera de X; y la asignatura C de la Carrera de Y"
 */
export function construirDestinatarios(grupos: GrupoConvocado[]): string {
  const asignaturasPorCarrera = new Map<string, string[]>();
  for (const grupo of grupos) {
    const carrera = grupo.carrera.trim();
    const asignatura = grupo.asignatura.trim();
    if (!carrera) continue;
    const lista = asignaturasPorCarrera.get(carrera) ?? [];
    if (asignatura) {
      const etiqueta = grupo.paralelo?.trim() ? `${asignatura} (paralelo ${grupo.paralelo.trim()})` : asignatura;
      if (!lista.includes(etiqueta)) lista.push(etiqueta);
    }
    asignaturasPorCarrera.set(carrera, lista);
  }

  const partes = Array.from(asignaturasPorCarrera.entries()).map(([carrera, asignaturas]) => {
    if (asignaturas.length === 0) return `la ${nombreCarrera(carrera)}`;
    const prefijo = asignaturas.length > 1 ? "las asignaturas" : "la asignatura";
    return `${prefijo} ${unirConY(asignaturas)} de la ${nombreCarrera(carrera)}`;
  });
  return partes.length > 1 ? `${partes.slice(0, -1).join("; ")}; y ${partes[partes.length - 1]}` : partes[0] ?? "";
}

function normalizar(texto: string): string {
  return (texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Une los estudiantes de todos los grupos, sin repetidos, ordenados alfabéticamente. Sin nombre usa el correo. */
export function consolidarEstudiantes(grupos: GrupoConvocado[]): { nombres: string[]; sinNombre: number } {
  const vistos = new Set<string>();
  const nombres: string[] = [];
  let sinNombre = 0;
  for (const grupo of grupos) {
    for (const estudiante of grupo.estudiantes) {
      const nombre = estudiante.nombre.trim().toUpperCase();
      const correo = (estudiante.correo ?? "").trim().toLowerCase();
      const clave = correo || normalizar(nombre);
      if (!clave || vistos.has(clave)) continue;
      vistos.add(clave);
      if (!nombre) sinNombre++;
      nombres.push(nombre || correo);
    }
  }
  nombres.sort((a, b) => normalizar(a).localeCompare(normalizar(b)));
  return { nombres, sinNombre };
}

/** Contexto docxtemplater para la tabla de asistencia de docentes (loop {{#docentes}}). */
export function datosDocentesParaLista(docentes: Docente[]) {
  return docentes.map((d, idx) => ({
    NUM: idx + 1,
    CARGO_DOCENTE: d.cargo,
    NOMBRE_DOCENTE: `${d.titulo_grado} ${d.nombre}, ${d.post_grado}`,
  }));
}

/** Contexto docxtemplater para el bloque de firmas de docentes (1 por fila, loop {{#firmantes}}). */
export function datosDocentesParaFirmas(docentes: Docente[]) {
  return docentes.map((d) => ({
    FIRMA_NOMBRE: `${d.titulo_grado} ${d.nombre}, ${d.post_grado}`,
    FIRMA_CARGO: d.cargo,
  }));
}
