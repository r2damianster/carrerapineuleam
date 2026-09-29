// Referencia — ya aplicado directo en Neon vía MCP (Sesión de permisos de
// Contribuciones: autor/coautor solo edita lo suyo, borrar solo admin/superadmin).
// Contribution.creadoPorId (usuarios.id de quien registró) permite distinguir
// "es dueño" de "es solo autor listado" sin depender de matchear authorName.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "creadoPorId" INTEGER`;
  console.log('OK: Contribution.creadoPorId');
}

main().catch(e => { console.error(e); process.exit(1); });
