import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// "Mi Perfil" (/portal/perfil) — datos privados de CUALQUIER profesor, tenga o no
// tarjeta pública en `members`. Antes orcid/genero/fecha_nacimiento solo vivían en
// `members` (scripts/migrate-members-perfil-academico.js, Sesión 29 WIP) — eso dejaba
// sin dónde guardar esos datos a los profesores sin tarjeta curada (la mayoría de los
// sembrados en scripts/migrate-usuarios-docentes.js, Sesión 27). `usuarios` pasa a ser
// la fuente única; se espeja a `members` solo si ya existe una tarjeta para ese email
// (ver lib/perfilSync.ts), nunca se crea una nueva por autoservicio.
//
// `cedula` ya existía (scripts/migrate-usuarios-perfil-profesor.js). `foto_url` es la
// foto interna del profesor — se sube por /api/upload y solo llega a la web pública
// (members.photo) tras aprobación de contenido_sitio.

async function migrate() {
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS orcid VARCHAR(25)`;
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS genero VARCHAR(20)`;
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE`;
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT`;
  console.log('Migración completada: usuarios.orcid/genero/fecha_nacimiento/foto_url');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
