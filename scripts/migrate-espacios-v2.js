import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE espacios_enseñanza ADD COLUMN IF NOT EXISTS area VARCHAR(20) NOT NULL DEFAULT 'vinculacion'`;
  console.log('espacios_enseñanza.area OK');

  await sql`
    CREATE TABLE IF NOT EXISTS espacio_instructores (
      espacio_id INTEGER REFERENCES espacios_enseñanza(id) ON DELETE CASCADE,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      PRIMARY KEY (espacio_id, usuario_id)
    )
  `;
  console.log('espacio_instructores OK');

  await sql`
    CREATE TABLE IF NOT EXISTS asistencia_espacio (
      id SERIAL PRIMARY KEY,
      espacio_id INTEGER REFERENCES espacios_enseñanza(id),
      fecha DATE NOT NULL,
      observaciones TEXT,
      registrado_por INTEGER REFERENCES usuarios(id),
      creado_en TIMESTAMP DEFAULT now()
    )
  `;
  console.log('asistencia_espacio OK');

  await sql`
    CREATE TABLE IF NOT EXISTS asistencia_beneficiarios (
      asistencia_id INTEGER REFERENCES asistencia_espacio(id) ON DELETE CASCADE,
      beneficiario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      PRIMARY KEY (asistencia_id, beneficiario_id)
    )
  `;
  console.log('asistencia_beneficiarios OK');

  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS categoria VARCHAR(20)`;
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS proyecto TEXT`;
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS asignatura TEXT`;
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS descripcion TEXT`;
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS hora TIME`;
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS observaciones TEXT`;
  console.log('actividades_difusion columnas nuevas OK');

  console.log('Migración v2 completa.');
}
run().catch(e => { console.error(e); process.exit(1); });
