import { sql } from "./db";

export const DEPENDENCIA_PINE = "Pedagogía de los Idiomas Nacionales y Extranjeros";

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

// ── Contactos externos (otras dependencias/instituciones) ──────────────────────────
// Personas que nunca inician sesión pero deben poder elegirse en Oficios (destinatario,
// firmante, CC). Mismo patrón que las autoridades externas sembradas en
// scripts/migrate-usuarios-docentes.js: rol=NULL, activado=false, email placeholder
// inutilizable y password_hash aleatorio. Las filas creadas desde la pantalla del
// directorio llevan el prefijo PREFIJO_EMAIL_DIRECTORIO: solo esas se pueden eliminar
// desde la UI (las autoridades sembradas por script quedan protegidas).
const PREFIJO_EMAIL_DIRECTORIO = "directorio.";
const SUFIJO_EMAIL_PLACEHOLDER = "@sin-email.pine";

export interface ContactoExterno extends Docente {
  eliminable: boolean;
}

export interface NuevoContactoExterno {
  titulo_grado: string;
  nombres: string;
  apellidos: string;
  post_grado: string;
  cargo: string;
  dependencia: string;
}

export async function listarContactosExternos(): Promise<ContactoExterno[]> {
  const rows = await sql`
    SELECT id, nombres, apellidos, titulo_grado, post_grado, cargo_institucional, dependencia, es_director, email
    FROM usuarios
    WHERE titulo_grado IS NOT NULL AND rol IS NULL
    ORDER BY dependencia ASC, apellidos ASC
  `;
  return (rows as Array<UsuarioDocenteRow & { email: string }>).map((row) => ({
    ...mapear(row),
    eliminable: row.email.startsWith(PREFIJO_EMAIL_DIRECTORIO) && row.email.endsWith(SUFIJO_EMAIL_PLACEHOLDER),
  }));
}

export async function crearContactoExterno(datos: NuevoContactoExterno): Promise<number> {
  const bcrypt = (await import("bcryptjs")).default;
  const { randomBytes, randomUUID } = await import("node:crypto");
  const hashInutilizable = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  const emailPlaceholder = `${PREFIJO_EMAIL_DIRECTORIO}${randomUUID()}${SUFIJO_EMAIL_PLACEHOLDER}`;
  const rows = await sql`
    INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado, titulo_grado, post_grado, cargo_institucional, es_director, dependencia)
    VALUES (${datos.nombres}, ${datos.apellidos}, ${emailPlaceholder}, ${hashInutilizable}, NULL, '{}', false, ${datos.titulo_grado}, ${datos.post_grado || null}, ${datos.cargo}, false, ${datos.dependencia})
    RETURNING id
  `;
  return (rows as Array<{ id: number }>)[0].id;
}

/** Devuelve true si borró una fila (solo contactos creados desde el directorio). */
export async function eliminarContactoExterno(id: number): Promise<boolean> {
  const rows = await sql`
    DELETE FROM usuarios
    WHERE id = ${id} AND rol IS NULL AND activado = false
      AND email LIKE ${PREFIJO_EMAIL_DIRECTORIO + "%" + SUFIJO_EMAIL_PLACEHOLDER}
    RETURNING id
  `;
  return (rows as unknown[]).length > 0;
}
