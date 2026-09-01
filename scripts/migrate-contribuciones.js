import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Crea las tablas del modulo Contribuciones (Prisma) a mano, en vez de
// `prisma db push`/`migrate dev`: el schema.prisma solo modela estas 2 tablas,
// y ambos comandos de Prisma comparan contra TODA la base y ofrecen borrar
// las demas tablas (usuarios, estudiantes, espacios, etc.) por no estar en
// el schema. Ver CLAUDE.md Sesion 24.

async function run() {
  await sql`
    DO $$ BEGIN
      CREATE TYPE "TipoPublicacion" AS ENUM (
        'ARTICULO_REGIONAL', 'ARTICULO_ALTO_IMPACTO', 'LIBRO',
        'CAPITULO_LIBRO', 'MEMORIA_EVENTO', 'PROPIEDAD_INTELECTUAL'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE "CategoriaDocente" AS ENUM (
        'AUXILIAR_I', 'AUXILIAR_II', 'AGREGADO_I', 'AGREGADO_II', 'PRINCIPAL_I', 'PRINCIPAL_II'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE "EstadoPublicacion" AS ENUM ('PUBLICADO', 'ACEPTADO', 'OTRO');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "Contribution" (
      "id" TEXT PRIMARY KEY,
      "codigo_ies" TEXT NOT NULL DEFAULT 'ULEAM',
      "facultad" TEXT NOT NULL DEFAULT 'Facultad de Educación y Turismo',
      "carrera" TEXT NOT NULL DEFAULT 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      "tipoPublicacion" "TipoPublicacion" NOT NULL,
      "tipoArticulo" TEXT,
      "codigoPublicacion" TEXT,
      "proyecto" TEXT,
      "titulo" TEXT NOT NULL,
      "tituloLibro" TEXT,
      "nombreRevista" TEXT,
      "issn" TEXT,
      "isbn" TEXT,
      "fechaPublicacion" TIMESTAMP(3) NOT NULL,
      "campoDetallado" TEXT NOT NULL,
      "estado" "EstadoPublicacion" NOT NULL,
      "linkPublicacion" TEXT,
      "linkRevista" TEXT,
      "filiacion" TEXT,
      "identificacionParticipante" TEXT,
      "categoria" "CategoriaDocente",
      "participacion" TEXT,
      "cuartil" TEXT,
      "lineaInvestigacion" TEXT NOT NULL,
      "intercultural" TEXT,
      "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "validadoPor" TEXT,
      "fechaValidacion" TIMESTAMP(3)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "ContributionAuthor" (
      "id" TEXT PRIMARY KEY,
      "contributionId" TEXT NOT NULL REFERENCES "Contribution"("id") ON DELETE CASCADE,
      "authorName" TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      "isCarreraAuthor" BOOLEAN NOT NULL
    );
  `;

  console.log('Contribution / ContributionAuthor OK');
}
run().catch(e => { console.error(e); process.exit(1); });
