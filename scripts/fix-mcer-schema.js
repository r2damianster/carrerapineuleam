import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// app/api/tests/route.ts inserta estudiante_evaluador_id y evidencia_url,
// pero scripts/migrate.js nunca creó esas columnas en evaluaciones_mcer.
// Esto hace que el guardado del test MCER falle siempre (columna inexistente).
async function run() {
  try {
    await sql`ALTER TABLE evaluaciones_mcer ADD COLUMN IF NOT EXISTS estudiante_evaluador_id INTEGER REFERENCES usuarios(id)`;
    await sql`ALTER TABLE evaluaciones_mcer ADD COLUMN IF NOT EXISTS evidencia_url TEXT`;
    console.log('OK: columnas estudiante_evaluador_id y evidencia_url agregadas a evaluaciones_mcer');
  } catch (error) {
    console.error(error);
  }
}

run();
