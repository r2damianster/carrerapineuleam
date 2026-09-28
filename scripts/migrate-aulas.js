// scripts/migrate-aulas.js
// Subaulas opcionales por espacio de Vinculación (punto 3 del pedido del usuario):
//   - tabla `aulas` (nombre, activa) bajo un espacio.
//   - `espacios_enseñanza.usa_aulas` decide si ese espacio las usa (default false —
//     la mayoría de espacios no las necesita, es opt-in).
//   - `aula_id` nullable en `espacio_instructores`/`inscripciones_espacio` para poder
//     acotar el checklist de asistencia a la aula elegida cuando el espacio la usa.
// Solo lo activa el líder de Vinculación/superadmin (puedeGestionarVinculacion, lib/modulos.ts)
// — nunca el profesor supervisor regular.
//
//   node --env-file=.env.local scripts/migrate-aulas.js
//
// Idempotente. ROLLBACK comentado al final.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS aulas (
      id SERIAL PRIMARY KEY,
      espacio_id INTEGER NOT NULL REFERENCES espacios_enseñanza(id) ON DELETE CASCADE,
      nombre VARCHAR(100) NOT NULL,
      activa BOOLEAN NOT NULL DEFAULT true,
      creado_en TIMESTAMP DEFAULT now()
    )
  `;
  console.log('[1] tabla aulas OK');

  await sql`ALTER TABLE espacios_enseñanza ADD COLUMN IF NOT EXISTS usa_aulas BOOLEAN NOT NULL DEFAULT false`;
  console.log('[2] espacios_enseñanza.usa_aulas OK');

  await sql`ALTER TABLE espacio_instructores ADD COLUMN IF NOT EXISTS aula_id INTEGER REFERENCES aulas(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE inscripciones_espacio ADD COLUMN IF NOT EXISTS aula_id INTEGER REFERENCES aulas(id) ON DELETE SET NULL`;
  console.log('[3] espacio_instructores.aula_id / inscripciones_espacio.aula_id OK');

  const [{ aulas, espacios }] = await sql`
    SELECT (SELECT count(*)::int FROM aulas) AS aulas,
           (SELECT count(*)::int FROM espacios_enseñanza WHERE usa_aulas) AS espacios`;
  console.log(`[4] verificación: aulas=${aulas} espacios_con_usa_aulas=${espacios} (ambos 0 es normal recién aplicada)`);
}

main().catch((error) => { console.error('ERROR:', error.message); process.exit(1); });

// ROLLBACK (solo si hace falta):
//   ALTER TABLE espacio_instructores DROP COLUMN aula_id;
//   ALTER TABLE inscripciones_espacio DROP COLUMN aula_id;
//   ALTER TABLE espacios_enseñanza DROP COLUMN usa_aulas;
//   DROP TABLE aulas;
