// Actividades no previstas (sección 2.3 del informe del supervisor) registradas a mano por el supervisor.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
await sql`
  CREATE TABLE IF NOT EXISTS informe_no_previstas (
    id SERIAL PRIMARY KEY,
    supervisor_id INTEGER NOT NULL REFERENCES usuarios(id),
    mes DATE NOT NULL,
    tarea TEXT NOT NULL,
    avance INTEGER NOT NULL DEFAULT 100 CHECK (avance BETWEEN 0 AND 100),
    alumnos INTEGER NOT NULL DEFAULT 0,
    productos_sociales TEXT,
    productos_academicos TEXT,
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_informe_no_previstas_supervisor_mes ON informe_no_previstas (supervisor_id, mes)`;
console.log('OK');
