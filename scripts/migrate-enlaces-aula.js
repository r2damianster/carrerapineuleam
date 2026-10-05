// El enlace/QR de pretest queda ligado a un aula cuando el espacio usa subaulas,
// para que cada beneficiario que se autoregistra quede inscrito en esa aula.
// Uso: node --env-file=.env.local scripts/migrate-enlaces-aula.js
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE enlaces_evaluacion ADD COLUMN IF NOT EXISTS aula_id INTEGER REFERENCES aulas(id) ON DELETE SET NULL`;
  console.log('enlaces_evaluacion.aula_id listo');
}

main().catch(error => { console.error(error); process.exit(1); });
