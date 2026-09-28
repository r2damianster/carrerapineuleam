// scripts/migrate-auditoria-ia-asistencia.js
// Auditoría IA (punto 5) de la foto de evidencia de asistencia — solo asistencia, no difusión.
// No bloquea nunca el guardado; es informativa para el supervisor. Ver lib/groqVision.ts.
//
//   node --env-file=.env.local scripts/migrate-auditoria-ia-asistencia.js
//
// Idempotente. ROLLBACK comentado al final.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`
    ALTER TABLE asistencia_espacio
      ADD COLUMN IF NOT EXISTS auditoria_ia_estado text,
      ADD COLUMN IF NOT EXISTS auditoria_ia_conteo_detectado integer,
      ADD COLUMN IF NOT EXISTS auditoria_ia_conteo_esperado integer`;
  await sql`ALTER TABLE asistencia_espacio DROP CONSTRAINT IF EXISTS asistencia_espacio_auditoria_ia_estado_check`;
  await sql`
    ALTER TABLE asistencia_espacio ADD CONSTRAINT asistencia_espacio_auditoria_ia_estado_check
      CHECK (auditoria_ia_estado IN ('ok', 'discrepancia', 'no_disponible', 'pendiente'))`;
  console.log('[1] asistencia_espacio.auditoria_ia_* OK');

  const [{ total }] = await sql`SELECT count(*)::int AS total FROM asistencia_espacio WHERE auditoria_ia_estado IS NOT NULL`;
  console.log(`[2] verificación: filas con auditoria_ia_estado ya asignado = ${total} (0 es normal recién aplicada)`);
}

main().catch((error) => { console.error('ERROR:', error.message); process.exit(1); });

// ROLLBACK (solo si hace falta):
//   ALTER TABLE asistencia_espacio DROP COLUMN auditoria_ia_estado, DROP COLUMN auditoria_ia_conteo_detectado, DROP COLUMN auditoria_ia_conteo_esperado;
