import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// "Mi Perfil" (/portal/perfil) — cola de aprobación para cambios que un profesor
// propone sobre SU PROPIA tarjeta pública ya curada en `members` (foto, grado,
// posgrado, ORCID, título específico). No se aplican directo: quedan en estas
// columnas pending_* hasta que contenido_sitio apruebe/rechace desde
// /admin/members (mismo patrón que actividades_difusion.aprobado_sitio/
// aprobado_por/fecha_aprobacion). TeamSection/TeamCard (web pública) solo lee las
// columnas reales — nunca pending_* — así que nada cambia en la web hasta aprobar.
//
// members.genero/fecha_nacimiento (scripts/migrate-members-perfil-academico.js,
// Sesión 29 WIP) quedan superadas por esta migración: la fuente pasa a ser
// usuarios.genero/usuarios.fecha_nacimiento (scripts/migrate-usuarios-perfil-privado.js),
// que nunca se publican en la web. No se borran esas columnas (no tienen uso pero
// tampoco riesgo de dejarlas).

async function migrate() {
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_photo TEXT`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_grado VARCHAR(30)`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_posgrado VARCHAR(30)`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_orcid VARCHAR(25)`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_titulo_especifico TEXT`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_solicitado_por INTEGER REFERENCES usuarios(id)`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_fecha_solicitud TIMESTAMPTZ`;
  console.log('Migración completada: members.pending_photo/grado/posgrado/orcid/titulo_especifico/solicitado_por/fecha_solicitud');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
