import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Agrega periodo_academico a actividades_difusion — tabla sin filas aún
// (confirmado antes de correr esto), no hace falta backfill.

async function run() {
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS periodo_academico TEXT;`;
  console.log('actividades_difusion: periodo_academico OK');
}
run().catch(e => { console.error(e); process.exit(1); });
