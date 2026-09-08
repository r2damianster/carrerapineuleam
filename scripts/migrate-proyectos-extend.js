// Activa la tabla `proyectos` (creada en migrate-proyectos.js pero nunca
// leída por ningún código hasta ahora) como fuente de config del nav
// público, para que ocultar/mostrar/reordenar un proyecto no requiera tocar
// Header.tsx. No se toca el CHECK de `area` (investigacion|vinculacion,
// usado en otras tablas) — el agrupamiento real del nav lo decide la
// columna nueva `grupo_nav`. Bilingüe con columnas _es/_en duplicadas (no
// JSON, igual que el resto del esquema) — el frontend cae a _es si falta
// _en. Aplicado directo en Neon vía MCP; script queda como referencia.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    ALTER TABLE proyectos
      ADD COLUMN IF NOT EXISTS slug TEXT,
      ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'personalizada' CHECK (tipo IN ('plantilla_simple', 'personalizada')),
      ADD COLUMN IF NOT EXISTS es_red BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS grupo_nav TEXT CHECK (grupo_nav IN ('docencia', 'investigacion', 'vinculacion', 'ninguno')),
      ADD COLUMN IF NOT EXISTS nav_label TEXT,
      ADD COLUMN IF NOT EXISTS "order" INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hero_title1_es TEXT,
      ADD COLUMN IF NOT EXISTS hero_title1_en TEXT,
      ADD COLUMN IF NOT EXISTS hero_title2_es TEXT,
      ADD COLUMN IF NOT EXISTS hero_title2_en TEXT,
      ADD COLUMN IF NOT EXISTS hero_subtitle_es TEXT,
      ADD COLUMN IF NOT EXISTS hero_subtitle_en TEXT,
      ADD COLUMN IF NOT EXISTS hero_description_es TEXT,
      ADD COLUMN IF NOT EXISTS hero_description_en TEXT,
      ADD COLUMN IF NOT EXISTS integration_text_es TEXT,
      ADD COLUMN IF NOT EXISTS integration_text_en TEXT,
      ADD COLUMN IF NOT EXISTS info_text_es TEXT,
      ADD COLUMN IF NOT EXISTS info_text_en TEXT,
      ADD COLUMN IF NOT EXISTS lider_nombre TEXT,
      ADD COLUMN IF NOT EXISTS lider_orcid TEXT
  `;

  // Backfill: desarrollo_habilidades y mentoring ya son plantilla_simple en
  // código hoy (mismo esqueleto ProjectHero+ProjectIntegrationNote+
  // TeamSection+Contact, solo cambia el projectKey) — se marcan así para
  // que /admin/proyectos ya las gestione con el formulario completo. Sus
  // textos actuales siguen viviendo en lib/i18n.tsx hasta que un admin los
  // edite desde el panel (no se migran automáticamente).
  await sql`
    UPDATE proyectos SET tipo = 'plantilla_simple', slug = id, grupo_nav = 'investigacion',
      nav_label = CASE id
        WHEN 'desarrollo_habilidades' THEN 'Desarrollo de Habilidades Lingüísticas'
        WHEN 'mentoring' THEN 'Mentoring'
      END,
      "order" = CASE id WHEN 'desarrollo_habilidades' THEN 2 WHEN 'mentoring' THEN 3 ELSE "order" END
    WHERE id IN ('desarrollo_habilidades', 'mentoring')
  `;

  await sql`
    UPDATE proyectos SET slug = 'proyecto-innovacion', grupo_nav = 'investigacion',
      nav_label = 'Innovaciones Pedagógicas e Internacionalización', "order" = 1
    WHERE id = 'internacionalizacion'
  `;

  await sql`
    UPDATE proyectos SET slug = 'dinamicas-linguisticas', grupo_nav = 'vinculacion',
      nav_label = 'Dinámicas Lingüísticas en Contextos Locales', "order" = 1
    WHERE id = 'vinculacion'
  `;

  // Docencia Innovadora y RED LEA no existían como filas (creadas fuera del
  // seed original de migrate-proyectos.js) — se agregan como 'personalizada'
  // para que el admin pueda al menos ocultar/mostrar/reordenar su entrada
  // de nav. area='investigacion' es un placeholder (el CHECK de area no
  // incluye 'docencia'); grupo_nav es quien decide el agrupamiento real.
  await sql`
    INSERT INTO proyectos (id, nombre_oficial, area, tipo, slug, grupo_nav, nav_label, "order")
    VALUES ('docencia_innovadora', 'Docencia Innovadora e Interdisciplinaria', 'investigacion', 'personalizada', 'docencia-innovadora', 'docencia', 'Docencia Innovadora e Interdisciplinaria', 1)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO proyectos (id, nombre_oficial, area, tipo, slug, grupo_nav, es_red, nav_label, "order")
    VALUES ('redlea', 'RED LEA', 'investigacion', 'personalizada', 'redlea', 'investigacion', true, 'RED LEA', 0)
    ON CONFLICT (id) DO NOTHING
  `;

  console.log('OK: proyectos extendida con columnas de nav/plantilla; docencia_innovadora y redlea agregadas');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
