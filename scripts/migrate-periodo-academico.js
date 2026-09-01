import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Agrega periodoAcademico ("AAAA-1" ene-jun / "AAAA-2" jul-dic) a Contribution,
// calculado a partir de fechaPublicacion — a mano, no `prisma db push`/`migrate`
// (ver advertencia permanente en CLAUDE.md). Backfillea los registros existentes
// antes de poner NOT NULL.

async function run() {
  await sql`ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "periodoAcademico" TEXT;`;
  await sql`
    UPDATE "Contribution"
    SET "periodoAcademico" = EXTRACT(YEAR FROM "fechaPublicacion") || '-' ||
      CASE WHEN EXTRACT(MONTH FROM "fechaPublicacion") <= 6 THEN '1' ELSE '2' END
    WHERE "periodoAcademico" IS NULL;
  `;
  await sql`ALTER TABLE "Contribution" ALTER COLUMN "periodoAcademico" SET NOT NULL;`;
  console.log('Contribution: periodoAcademico OK');
}
run().catch(e => { console.error(e); process.exit(1); });
