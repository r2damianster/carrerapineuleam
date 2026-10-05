// Metas específicas que cada líder agrega a su proyecto por ciclo (además de las 4 metas fijas de
// proyecto_metas_ciclo). Aditiva. Ya aplicada en Neon (Sesión 62). Uso: node --env-file=.env.local scripts/migrate-metas-personalizadas.js
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS proyecto_metas_personalizadas (
      id SERIAL PRIMARY KEY,
      proyecto_id TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
      ciclo_id INTEGER REFERENCES ciclos_academicos(id) ON DELETE CASCADE, -- sin uso: las metas específicas son del proyecto completo
      descripcion TEXT NOT NULL,
      meta NUMERIC NOT NULL DEFAULT 0,
      logrado NUMERIC NOT NULL DEFAULT 0,
      unidad TEXT,
      tipo TEXT NOT NULL DEFAULT 'absoluto' CHECK (tipo IN ('absoluto','porcentual')), -- porcentual: meta y logrado en %
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`ALTER TABLE proyecto_metas_personalizadas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'absoluto' CHECK (tipo IN ('absoluto','porcentual'))`;
  // Meta por defecto de cada proyecto ("Estudiantes involucrados"): no se puede eliminar ni renombrar.
  await sql`ALTER TABLE proyecto_metas_personalizadas ADD COLUMN IF NOT EXISTS es_defecto BOOLEAN NOT NULL DEFAULT false`;
  await sql`CREATE INDEX IF NOT EXISTS proyecto_metas_personalizadas_idx ON proyecto_metas_personalizadas(proyecto_id, ciclo_id)`;
  console.log('proyecto_metas_personalizadas lista');
}

main().catch((error) => { console.error(error); process.exit(1); });
