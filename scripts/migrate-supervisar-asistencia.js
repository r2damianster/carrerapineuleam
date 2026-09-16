// Sesión 41: supervisión de asistencia con foto+aprobación (patrón de
// actividades_difusion) + horas acreditables al instructor por hora_inicio/
// hora_fin real (patrón horas_podcast_pasante, se calculan recién al
// aprobar). Aplicado directo en Neon vía MCP — este script queda como
// referencia idéntica al cambio ya aplicado en producción.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    ALTER TABLE asistencia_espacio
      ADD COLUMN IF NOT EXISTS hora_inicio TIME,
      ADD COLUMN IF NOT EXISTS hora_fin TIME,
      ADD COLUMN IF NOT EXISTS foto_url TEXT,
      ADD COLUMN IF NOT EXISTS foto_public_id TEXT,
      ADD COLUMN IF NOT EXISTS estado_aprobacion TEXT NOT NULL DEFAULT 'pendiente',
      ADD COLUMN IF NOT EXISTS aprobado_por INTEGER REFERENCES usuarios(id),
      ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP,
      ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT
  `;
  console.log('asistencia_espacio columnas nuevas OK');

  await sql`
    ALTER TABLE asistencia_espacio
      ADD CONSTRAINT asistencia_espacio_estado_check CHECK (estado_aprobacion IN ('pendiente','aprobado','rechazado'))
  `;
  console.log('asistencia_espacio_estado_check OK');

  await sql`
    CREATE TABLE IF NOT EXISTS horas_asistencia_instructor (
      id SERIAL PRIMARY KEY,
      asistencia_id INTEGER NOT NULL REFERENCES asistencia_espacio(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      horas NUMERIC(5,2) NOT NULL,
      creado_en TIMESTAMP DEFAULT now(),
      UNIQUE (asistencia_id, usuario_id)
    )
  `;
  console.log('horas_asistencia_instructor OK');

  console.log('Migración supervisar-asistencia completa.');
}
run().catch(e => { console.error(e); process.exit(1); });
