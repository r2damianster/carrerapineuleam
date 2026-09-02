import { sql } from "./db";

export interface Docente {
  id: number;
  titulo_grado: string;
  nombre: string;
  post_grado: string;
  cargo: string;
  carrera: string;
  es_director: boolean;
}

interface UsuarioDocenteRow {
  id: number;
  nombres: string;
  apellidos: string;
  titulo_grado: string | null;
  post_grado: string | null;
  cargo_institucional: string | null;
  dependencia: string | null;
  es_director: boolean;
}

// Fuente única: usuarios (con columnas titulo_grado/post_grado/cargo_institucional/
// dependencia/es_director, ver scripts/migrate-usuarios-docentes.js). Antes esto leía
// de una tabla `docentes` separada que nunca llegó a crearse en producción — dos
// catálogos de "quién es docente" para el mismo proyecto. Una fila de usuarios
// "aparece" en Convocatorias/Oficios/Acta Técnica cuando titulo_grado IS NOT NULL,
// sin importar su `rol` (autoridades externas que nunca inician sesión tienen rol=NULL).
function mapear(row: UsuarioDocenteRow): Docente {
  return {
    id: row.id,
    titulo_grado: row.titulo_grado ?? "",
    nombre: `${row.nombres} ${row.apellidos}`.replace(/\s+/g, " ").trim(),
    post_grado: row.post_grado ?? "",
    cargo: row.cargo_institucional ?? "",
    carrera: row.dependencia ?? "",
    es_director: row.es_director,
  };
}

export async function getAllDocentes(): Promise<Docente[]> {
  const rows = await sql`
    SELECT id, nombres, apellidos, titulo_grado, post_grado, cargo_institucional, dependencia, es_director
    FROM usuarios
    WHERE titulo_grado IS NOT NULL
    ORDER BY es_director DESC, apellidos ASC
  `;
  return (rows as UsuarioDocenteRow[]).map(mapear);
}

export async function getDocentesByCarrera(carrera: string): Promise<Docente[]> {
  const rows = await sql`
    SELECT id, nombres, apellidos, titulo_grado, post_grado, cargo_institucional, dependencia, es_director
    FROM usuarios
    WHERE titulo_grado IS NOT NULL AND dependencia = ${carrera}
    ORDER BY es_director DESC, apellidos ASC
  `;
  return (rows as UsuarioDocenteRow[]).map(mapear);
}

export async function getAllCarreras(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT dependencia
    FROM usuarios
    WHERE titulo_grado IS NOT NULL AND dependencia IS NOT NULL
    ORDER BY dependencia ASC
  `;
  return (rows as Array<{ dependencia: string }>).map((r) => r.dependencia);
}
