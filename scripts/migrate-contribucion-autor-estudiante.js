import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Agrega "esEstudiante" a ContributionAuthor a mano (ALTER TABLE), no `prisma db push`
// (ver advertencia permanente en CLAUDE.md — Sesion 24: ese comando compara el schema
// contra TODA la base y ofrece borrar las tablas que no conoce).

async function run() {
  await sql`
    ALTER TABLE "ContributionAuthor"
    ADD COLUMN IF NOT EXISTS "esEstudiante" BOOLEAN NOT NULL DEFAULT false;
  `;
  console.log('ContributionAuthor.esEstudiante OK');
}
run().catch(e => { console.error(e); process.exit(1); });
