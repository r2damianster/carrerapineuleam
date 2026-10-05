// Encuesta de impacto percibido + evaluación por pasante con observación + trazabilidad de quién llenó.
// Aditiva: las filas viejas quedan intactas (columnas nuevas nullable).
// Uso: node --env-file=.env.local scripts/migrate-encuesta-impacto.js
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`ALTER TABLE encuestas_satisfaccion
    ADD COLUMN IF NOT EXISTS impacto_estudios INTEGER CHECK (impacto_estudios BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS uso_aprendido INTEGER CHECK (uso_aprendido BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS seguridad_hablar INTEGER CHECK (seguridad_hablar BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS oportunidades INTEGER CHECK (oportunidades BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS recomendaria INTEGER CHECK (recomendaria BETWEEN 0 AND 10),
    ADD COLUMN IF NOT EXISTS espacio_id INTEGER,
    ADD COLUMN IF NOT EXISTS origen TEXT CHECK (origen IN ('qr_beneficiario', 'panel_pasante', 'panel_docente')),
    ADD COLUMN IF NOT EXISTS registrado_por INTEGER`;

  await sql`ALTER TABLE encuesta_evaluaciones_instructor
    ALTER COLUMN calificacion DROP NOT NULL`;
  await sql`ALTER TABLE encuesta_evaluaciones_instructor
    ADD COLUMN IF NOT EXISTS observacion TEXT,
    ADD COLUMN IF NOT EXISTS no_aplica BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS sesiones_compartidas INTEGER`;
  await sql`ALTER TABLE encuesta_evaluaciones_instructor
    DROP CONSTRAINT IF EXISTS encuesta_eval_instructor_nota_o_no_aplica`;
  await sql`ALTER TABLE encuesta_evaluaciones_instructor
    ADD CONSTRAINT encuesta_eval_instructor_nota_o_no_aplica
    CHECK (no_aplica OR calificacion IS NOT NULL)`;

  console.log('Migración de encuesta de impacto aplicada.');
}

main().catch((error) => { console.error(error); process.exit(1); });
