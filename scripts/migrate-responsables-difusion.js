import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS profesores_responsables INTEGER[] NOT NULL DEFAULT '{}'`;
  console.log('actividades_difusion.profesores_responsables OK');
}
run().catch(e => { console.error(e); process.exit(1); });
