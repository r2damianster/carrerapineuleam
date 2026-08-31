import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activado BOOLEAN NOT NULL DEFAULT true`;
  console.log('usuarios.activado OK');
}
run().catch(e => { console.error(e); process.exit(1); });
