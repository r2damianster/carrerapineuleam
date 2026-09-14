// Sesión 38 — Área/proyecto seleccionable + participantes + horas acreditables
// de podcasts de Vinculación. Referencia: aplicado directo en Neon vía MCP.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  // videos.proyecto_id: TEXT -> TEXT[] (siempre incluye el proyecto elegido +
  // 'internacionalizacion', ver lib/registrarVideoPropuesto.ts)
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS proyecto_id_arr TEXT[]`;
  await sql`UPDATE videos SET proyecto_id_arr = ARRAY[proyecto_id] WHERE proyecto_id IS NOT NULL AND proyecto_id_arr IS NULL`;
  await sql`ALTER TABLE videos DROP COLUMN IF EXISTS proyecto_id`;
  await sql`ALTER TABLE videos RENAME COLUMN proyecto_id_arr TO proyecto_id`;

  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS participantes_estudiantes INTEGER[] DEFAULT '{}'`;
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS invitados_internos TEXT[] DEFAULT '{}'`;
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS invitados_externos TEXT[] DEFAULT '{}'`;

  await sql`
    CREATE TABLE IF NOT EXISTS horas_podcast_pasante (
      id SERIAL PRIMARY KEY,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      tipo_podcast TEXT NOT NULL CHECK (tipo_podcast IN ('solitario','interno','externo')),
      panelistas_internos_adicionales INTEGER NOT NULL DEFAULT 0,
      panelistas_externos_adicionales INTEGER NOT NULL DEFAULT 0,
      audiencia_alcanzada INTEGER NOT NULL DEFAULT 0,
      horas_base NUMERIC NOT NULL,
      horas_bono_panelistas NUMERIC NOT NULL DEFAULT 0,
      horas_bono_audiencia NUMERIC NOT NULL DEFAULT 0,
      horas_total NUMERIC NOT NULL,
      creado_en TIMESTAMP DEFAULT now(),
      UNIQUE(video_id, usuario_id)
    )
  `;

  console.log('OK');
}

main().catch((err) => { console.error(err); process.exit(1); });
