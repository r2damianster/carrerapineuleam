import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Perfil académico de `members` (tarjeta pública del equipo) — Sesión 29.
// `orcid` ya existía. Nuevos:
//   genero            VARCHAR(20) — interno, NO se renderiza en TeamCard
//   fecha_nacimiento  DATE        — interno, NO se renderiza en TeamCard
//   grado             VARCHAR(30) — opción fija: Licenciado/a, Ingeniero/a,
//                                   Doctor/a, Psicólogo/a. Se compone con
//                                   `name` al mostrar (ver
//                                   components/TeamSection.tsx:
//                                   GRADO_ABREVIADO/displayNameConTitulo)
//   posgrado          VARCHAR(30) — opción fija: Magíster, PhD. Igual que
//                                   grado, se compone al mostrar.
//   titulo_especifico TEXT        — texto libre opcional (ej. "Magíster en
//                                   Docencia e Investigación Educativa"),
//                                   no se renderiza todavía.
//
// `name` dejó de llevar el título pegado como texto ("Dr. Fulano, PhD.")
// — ahora guarda solo el nombre; grado/posgrado son campos aparte. Las
// filas existentes con título ya visible se migraron a mano (ver tabla de
// confirmación con el usuario, Sesión 29) — este script solo agrega las
// columnas, no repite esos UPDATE (ya aplicados en producción vía Neon
// MCP).

async function migrate() {
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS genero VARCHAR(20)`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS grado VARCHAR(30)`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS posgrado VARCHAR(30)`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS titulo_especifico TEXT`;
  console.log('Migración completada: members.genero/fecha_nacimiento/grado/posgrado/titulo_especifico');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
