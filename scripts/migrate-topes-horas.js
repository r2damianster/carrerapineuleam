// Topes de horas por pasante y por tipo de actividad (Sesión 50). Los edita el líder de
// Vinculación / superadmin en /vinculacion/topes-horas. NULL = sin tope propio (aplica el perfil
// por defecto de lib/topesHoras.ts); 0 = tipo no habilitado para ese pasante. meta_total es el
// máximo de horas contables en informes (normalmente 96).
// node --env-file=.env.local scripts/migrate-topes-horas.js
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS topes_horas_pasante (
      usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      tope_asistencia NUMERIC(6,2) CHECK (tope_asistencia IS NULL OR tope_asistencia >= 0),
      tope_autonomas NUMERIC(6,2) CHECK (tope_autonomas IS NULL OR tope_autonomas >= 0),
      tope_investigacion NUMERIC(6,2) CHECK (tope_investigacion IS NULL OR tope_investigacion >= 0),
      tope_podcast NUMERIC(6,2) CHECK (tope_podcast IS NULL OR tope_podcast >= 0),
      meta_total NUMERIC(6,2) NOT NULL DEFAULT 96 CHECK (meta_total > 0),
      actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      actualizado_en TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log('migrate-topes-horas OK');
}

main().catch(err => { console.error(err); process.exit(1); });
