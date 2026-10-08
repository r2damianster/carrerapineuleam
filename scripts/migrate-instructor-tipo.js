// espacio_instructores.tipo: 'titular' (espacio principal del pasante, su supervisor aprueba
// podcast/investigación/autónomas) | 'apoyo' (espacio secundario permanente: aparece siempre en el
// checklist de asistencia y su supervisor aprueba las horas de ESAS sesiones, pero no es su supervisor global).
// Uso: node --env-file=.env.local scripts/migrate-instructor-tipo.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE espacio_instructores ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'titular'`;
  await sql`ALTER TABLE espacio_instructores DROP CONSTRAINT IF EXISTS espacio_instructores_tipo_check`;
  await sql`ALTER TABLE espacio_instructores ADD CONSTRAINT espacio_instructores_tipo_check CHECK (tipo IN ('titular','apoyo'))`;
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM espacio_instructores WHERE tipo = 'titular'`;
  console.log(`espacio_instructores.tipo OK (${n} filas titulares)`);
}
run().catch(e => { console.error(e); process.exit(1); });
// Rollback: ALTER TABLE espacio_instructores DROP COLUMN tipo;
