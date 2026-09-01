import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Agrega los campos específicos por tipo de contribución (Nivel 2 del formato
// institucional) a mano (ALTER TABLE), no `prisma db push` (ver advertencia
// permanente en CLAUDE.md — Sesion 24).

async function run() {
  await sql`
    ALTER TABLE "Contribution"
    ADD COLUMN IF NOT EXISTS "baseDatosIndexada" TEXT,
    ADD COLUMN IF NOT EXISTS "revisadoPares" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "tituloCapitulo" TEXT,
    ADD COLUMN IF NOT EXISTS "editorCompilador" TEXT,
    ADD COLUMN IF NOT EXISTS "paginas" TEXT,
    ADD COLUMN IF NOT EXISTS "totalCapituloLibro" INTEGER,
    ADD COLUMN IF NOT EXISTS "nombrePonencia" TEXT,
    ADD COLUMN IF NOT EXISTS "nombreEvento" TEXT,
    ADD COLUMN IF NOT EXISTS "edicionEvento" TEXT,
    ADD COLUMN IF NOT EXISTS "organizadorEvento" TEXT,
    ADD COLUMN IF NOT EXISTS "comiteOrganizador" TEXT,
    ADD COLUMN IF NOT EXISTS "pais" TEXT,
    ADD COLUMN IF NOT EXISTS "ciudad" TEXT,
    ADD COLUMN IF NOT EXISTS "certificadoN" TEXT,
    ADD COLUMN IF NOT EXISTS "solicitudN" TEXT,
    ADD COLUMN IF NOT EXISTS "claseDeObra" TEXT,
    ADD COLUMN IF NOT EXISTS "tituloObra" TEXT,
    ADD COLUMN IF NOT EXISTS "lugar" TEXT;
  `;
  console.log('Contribution: campos especificos por tipo OK');
}
run().catch(e => { console.error(e); process.exit(1); });
