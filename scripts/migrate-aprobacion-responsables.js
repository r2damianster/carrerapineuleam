// scripts/migrate-aprobacion-responsables.js
// Aprobación de contenido sin depender solo de administración del sitio (Sesión 53):
//   1) fotos.calidad — segunda confirmación (aparte de menores) antes de publicar.
//   2) fotos.propuestas — cola de "proponer para portada" (líder propone, admin aprueba/rechaza).
//   3) videos.profesores_responsables + videos.actividad_difusion_id — igual patrón que
//      actividades_difusion.profesores_responsables; permite que el responsable (o el
//      supervisor del pasante) apruebe el video sin pasar por /admin/videos.
//   4) fotos_ubicaciones.rotar — galerías de proyecto rotan (recientes + muestra aleatoria del
//      resto) en vez de un tope curado a mano; portada sigue curada (rotar=false).
//
//   node --env-file=.env.local scripts/migrate-aprobacion-responsables.js
//
// Idempotente. Requiere haber corrido migrate-fotos-banco.js. ROLLBACK comentado al final.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS respaldo_aprobacion_responsables_20260927 AS
            SELECT 'fotos'::text AS tabla, to_jsonb(f.*) AS fila FROM fotos f
            UNION ALL SELECT 'videos', to_jsonb(v.*) FROM videos v
            UNION ALL SELECT 'fotos_ubicaciones', to_jsonb(u.*) FROM fotos_ubicaciones u`;
  console.log('[0] respaldo OK');

  await sql`
    ALTER TABLE fotos
      ADD COLUMN IF NOT EXISTS calidad             text        NOT NULL DEFAULT 'no_revisada',
      ADD COLUMN IF NOT EXISTS calidad_revisada_por integer     REFERENCES usuarios(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS calidad_revisada_en  timestamptz,
      ADD COLUMN IF NOT EXISTS propuestas           text[]      NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_calidad_check`;
  await sql`ALTER TABLE fotos ADD CONSTRAINT fotos_calidad_check CHECK (calidad IN ('no_revisada', 'aceptable', 'mala'))`;
  console.log('[1] fotos.calidad / fotos.propuestas OK');

  await sql`
    ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS profesores_responsables integer[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS actividad_difusion_id    integer   REFERENCES actividades_difusion(id) ON DELETE SET NULL`;
  console.log('[2] videos.profesores_responsables / actividad_difusion_id OK');

  await sql`ALTER TABLE fotos_ubicaciones ADD COLUMN IF NOT EXISTS rotar boolean NOT NULL DEFAULT true`;
  await sql`UPDATE fotos_ubicaciones SET rotar = false WHERE solo_admin = true`;
  console.log('[3] fotos_ubicaciones.rotar OK (portada queda curada a mano)');

  const [{ fotos, videos, ubicaciones, portadaRotar }] = await sql`
    SELECT
      (SELECT count(*)::int FROM fotos) AS fotos,
      (SELECT count(*)::int FROM videos) AS videos,
      (SELECT count(*)::int FROM fotos_ubicaciones) AS ubicaciones,
      (SELECT count(*)::int FROM fotos_ubicaciones WHERE solo_admin AND rotar) AS "portadaRotar"`;
  console.log(`[4] verificación: fotos=${fotos} videos=${videos} ubicaciones=${ubicaciones} portada_con_rotar_prendido=${portadaRotar} (debe ser 0)`);
}

main().catch((error) => { console.error('ERROR:', error.message); process.exit(1); });

// ROLLBACK (solo si hace falta):
//   ALTER TABLE fotos DROP COLUMN calidad, DROP COLUMN calidad_revisada_por, DROP COLUMN calidad_revisada_en, DROP COLUMN propuestas;
//   ALTER TABLE videos DROP COLUMN profesores_responsables, DROP COLUMN actividad_difusion_id;
//   ALTER TABLE fotos_ubicaciones DROP COLUMN rotar;
//   (los valores previos quedan en respaldo_aprobacion_responsables_20260927, por si hace falta restaurar algo puntual)
