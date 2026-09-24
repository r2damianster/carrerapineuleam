// Horas/actividades autónomas de pasantes de Vinculación (Sesión 50): planificar, crear
// recursos, etc. Mismo patrón que actividades_investigacion_pasante (aprobación por
// supervisor). Tope de 16 h por pasante: se valida en la aplicación (lib/horasAutonomas.ts).
// Ejecutar: node --env-file=.env.local scripts/migrate-actividades-autonomas.js
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS actividades_autonomas_pasante (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      descripcion TEXT NOT NULL,
      horas NUMERIC(5,2) NOT NULL CHECK (horas > 0),
      estado_aprobacion TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (estado_aprobacion IN ('pendiente','aprobado','rechazado')),
      aprobado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      fecha_aprobacion TIMESTAMP,
      motivo_rechazo TEXT,
      creado_en TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_actividades_autonomas_usuario ON actividades_autonomas_pasante(usuario_id)`;
  console.log('migrate-actividades-autonomas OK');
}

main().catch(err => { console.error(err); process.exit(1); });
