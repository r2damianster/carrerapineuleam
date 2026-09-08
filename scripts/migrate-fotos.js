// Banco de fotos administrable: tabla nueva `fotos`, consumida por
// PhotoCarousel (ubicaciones[] es un slot reusable, mismo patrón que
// members.projects, para poder poner el mismo banco en más de un lugar del
// sitio sin otra migración). Aplicado directo en Neon vía MCP; script queda
// como referencia. Sembradas las 4 fotos iniciales del usuario (sin fecha
// real de evento conocida — se documenta en `titulo`, no en el nombre de
// archivo).
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS fotos (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      cloudinary_public_id TEXT,
      titulo TEXT,
      descripcion TEXT,
      ubicaciones TEXT[] NOT NULL DEFAULT '{}',
      "order" INT NOT NULL DEFAULT 0,
      activo BOOLEAN NOT NULL DEFAULT true,
      subido_por TEXT,
      origen TEXT NOT NULL DEFAULT 'admin' CHECK (origen IN ('admin', 'evidencia_evento')),
      created TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // posicion (top|center|bottom) agregada después, ver scripts/migrate-fotos-posicion.js

  await sql`
    INSERT INTO fotos (id, url, titulo, ubicaciones, "order") VALUES
      ('foto_1', '/images/2026-09-08_Graduacion-CarreraPINE.jpg', 'Graduación de estudiantes', ARRAY['portada'], 1),
      ('foto_2', '/images/2026-09-08_CertificadosCarreraPINE.jpg', 'Entrega de certificados', ARRAY['portada'], 2),
      ('foto_3', '/images/2026-09-08_EnglishLanguageTeachingUpgrade.jpg', 'English Language Teaching Upgrade', ARRAY['portada'], 3),
      ('foto_4', '/images/2026-09-08_PosterSession-CarreraPINE.jpg', 'Poster session', ARRAY['portada'], 4)
    ON CONFLICT (id) DO NOTHING
  `;

  console.log('OK: tabla fotos creada y sembrada con 4 fotos iniciales');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
