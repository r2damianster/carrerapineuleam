// Cada pasante con módulo 'investigacion' aporta a UN proyecto de investigación, elegido por
// el líder de Vinculación. La actividad guarda una copia del proyecto vigente al registrarla.
// Uso: node --env-file=.env.local scripts/migrate-investigacion-proyecto.js
const { neon } = require('@neondatabase/serverless');

(async () => {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS proyecto_investigacion_id TEXT`;
  await sql`ALTER TABLE actividades_investigacion_pasante ADD COLUMN IF NOT EXISTS proyecto_id TEXT`;
  // Backfill: hoy todo aporta a Innovaciones Pedagógicas e Internacionalización.
  await sql`UPDATE usuarios SET proyecto_investigacion_id = 'internacionalizacion'
            WHERE rol = 'estudiante' AND 'investigacion' = ANY(modulos_acceso) AND proyecto_investigacion_id IS NULL`;
  await sql`UPDATE actividades_investigacion_pasante SET proyecto_id = 'internacionalizacion' WHERE proyecto_id IS NULL`;
  console.log('OK');
})();
