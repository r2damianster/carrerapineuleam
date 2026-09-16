// Sesión 43: registro real de qué pasantes (titulares del espacio o
// invitados de otro espacio) asistieron a una sesión de club — antes las
// horas se acreditaban a ciegas a TODOS los espacio_instructores del espacio,
// sin importar si vinieron ese día. Mismo patrón que asistencia_beneficiarios
// (solo se inserta una fila por presente, nunca por ausente).
// Aplicado directo en Neon vía MCP — este script queda como referencia
// idéntica al cambio ya aplicado en producción.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS asistencia_instructores (
      id SERIAL PRIMARY KEY,
      asistencia_id INTEGER NOT NULL REFERENCES asistencia_espacio(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      tipo TEXT NOT NULL DEFAULT 'titular' CHECK (tipo IN ('titular','invitado')),
      creado_en TIMESTAMP DEFAULT now(),
      UNIQUE (asistencia_id, usuario_id)
    )
  `;
  console.log('asistencia_instructores OK');
}
run().catch(e => { console.error(e); process.exit(1); });
