// Agrega `impacto` a supervision_obstaculos (el resto de columnas ya existe: restriccion, accion_correctiva).
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
(async () => {
  await sql`ALTER TABLE supervision_obstaculos ADD COLUMN IF NOT EXISTS impacto TEXT NOT NULL DEFAULT 'medio'`;
  console.log('OK');
})();
