// Tabla para que un pasante con funciones de investigación (usuarios.modulos_acceso
// incluye 'investigacion') reporte sus actividades — sin aprobación del profesor,
// solo registro para un futuro informe agregado. Ejecutar:
// node --env-file=.env.local scripts/migrate-actividades-investigacion-pasante.js
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS actividades_investigacion_pasante (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      espacio_id INTEGER REFERENCES espacios_enseñanza(id) ON DELETE SET NULL,
      fecha DATE NOT NULL,
      descripcion TEXT NOT NULL,
      horas NUMERIC(5,2) NOT NULL CHECK (horas > 0),
      creado_en TIMESTAMP DEFAULT now()
    )
  `;
  console.log('actividades_investigacion_pasante OK');

  const cols = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'actividades_investigacion_pasante'
    ORDER BY ordinal_position
  `;
  console.log(JSON.stringify(cols, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
