// Agrega columna `activo` (default true) a publications/videos/members para
// permitir "ocultar sin borrar" en /admin — Sesión 30. Aplicado directo en
// Neon vía MCP en esta sesión; script queda como referencia.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE publications ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true`;
  console.log('OK: columna activo agregada a publications, videos, members');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
