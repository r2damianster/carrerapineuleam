const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Catálogo real de proyectos del grupo (antes vivía disperso en 3 lugares no
// sincronizados: members.projects, lib/data.ts:liderProyectoPropio, y el
// array PROYECTOS hardcodeado del wizard de Contribuciones). Área
// investigacion/vinculacion según el dropdown real del Header:
// Investigación agrupa Internacionalización + Desarrollo de Habilidades +
// Mentoring; Vinculación es solo Dinámicas Lingüísticas (Cynthia).
//
// area_sustantiva/proyecto_id/asignaturas son aditivos — no rompen nada
// existente. categoria/proyecto/asignatura (texto libre) se dejan intactos
// hasta migrar todos los formularios.

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS proyectos (
      id TEXT PRIMARY KEY,
      nombre_oficial TEXT NOT NULL,
      area TEXT NOT NULL CHECK (area IN ('investigacion', 'vinculacion')),
      lider_email TEXT,
      activo BOOLEAN NOT NULL DEFAULT true
    )
  `;

  await sql`
    INSERT INTO proyectos (id, nombre_oficial, area, lider_email) VALUES
      ('internacionalizacion', 'Innovaciones Pedagógicas e Internacionalización', 'investigacion', 'arturo.rodriguez@uleam.edu.ec'),
      ('desarrollo_habilidades', 'Desarrollo de Habilidades Lingüísticas', 'investigacion', 'german.carrera@uleam.edu.ec'),
      ('mentoring', 'Mentoring', 'investigacion', 'veronica.chavez@uleam.edu.ec'),
      ('vinculacion', 'Dinámicas Lingüísticas en Contextos Locales', 'vinculacion', 'cintya.zambrano@uleam.edu.ec')
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    ALTER TABLE actividades_difusion
      ADD COLUMN IF NOT EXISTS area_sustantiva TEXT CHECK (area_sustantiva IN ('docencia', 'investigacion', 'vinculacion')),
      ADD COLUMN IF NOT EXISTS proyecto_id TEXT REFERENCES proyectos(id),
      ADD COLUMN IF NOT EXISTS asignaturas TEXT[] NOT NULL DEFAULT '{}'
  `;

  await sql`
    ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS area_sustantiva TEXT CHECK (area_sustantiva IN ('docencia', 'investigacion', 'vinculacion')),
      ADD COLUMN IF NOT EXISTS proyecto_id TEXT REFERENCES proyectos(id)
  `;

  // videos.tags ya tiene la función sustantiva limpia como primer tag en
  // las 20 filas (confirmado por consulta previa) — se traslada 1:1.
  await sql`
    UPDATE videos
    SET area_sustantiva = tags[1]
    WHERE tags[1] IN ('docencia', 'investigacion', 'vinculacion')
      AND area_sustantiva IS NULL
  `;

  console.log('Tabla proyectos creada y sembrada; columnas area_sustantiva/proyecto_id/asignaturas agregadas; videos.area_sustantiva poblada desde tags.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
