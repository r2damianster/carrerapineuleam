import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Amplía actividades_difusion (tabla ya en producción, 0 filas propias hasta
// ahora) para que también sirva de home a News + Activities del sitio
// estático — fusión pedida por el usuario, Sesión 25. Todo ADD COLUMN
// aditivo, no toca columnas existentes (usadas por /vinculacion/difusion y
// /gestion-carrera, ya en producción).

async function run() {
  await sql`
    ALTER TABLE actividades_difusion
      ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'difusion',
      ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS external_link TEXT,
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS aprobado_sitio BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS aprobado_por INTEGER REFERENCES usuarios(id),
      ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ;
  `;
  console.log('actividades_difusion: columnas nuevas OK');
}
run().catch(e => { console.error(e); process.exit(1); });
