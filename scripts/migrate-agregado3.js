import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Agrega AGREGADO_III al enum CategoriaDocente (escalafón docente ULEAM llega
// hasta Agregado III, el enum original solo tenía I/II) — a mano, no
// `prisma db push`/`migrate` (ver advertencia permanente en CLAUDE.md).

async function run() {
  await sql`ALTER TYPE "CategoriaDocente" ADD VALUE IF NOT EXISTS 'AGREGADO_III' AFTER 'AGREGADO_II';`;
  console.log('CategoriaDocente: AGREGADO_III agregado');
}
run().catch(e => { console.error(e); process.exit(1); });
