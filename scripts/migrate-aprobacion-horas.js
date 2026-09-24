// Estado de aprobación por supervisor para horas de podcast e investigación de pasantes
// (Sesión 50). Antes las horas de podcast dependían de videos.aprobado_sitio (publicación en la web)
// y las de investigación no tenían aprobación. Ejecutar:
// node --env-file=.env.local scripts/migrate-aprobacion-horas.js
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  for (const tabla of ['horas_podcast_pasante', 'actividades_investigacion_pasante']) {
    await sql.query(`
      ALTER TABLE ${tabla}
        ADD COLUMN IF NOT EXISTS estado_aprobacion TEXT NOT NULL DEFAULT 'pendiente',
        ADD COLUMN IF NOT EXISTS aprobado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP,
        ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT
    `);
    await sql.query(`ALTER TABLE ${tabla} DROP CONSTRAINT IF EXISTS ${tabla}_estado_aprobacion_check`);
    await sql.query(`
      ALTER TABLE ${tabla}
        ADD CONSTRAINT ${tabla}_estado_aprobacion_check
        CHECK (estado_aprobacion IN ('pendiente','aprobado','rechazado'))
    `);
  }

  // Filas previas: podcast ya publicado en la web -> aprobado (conserva horas acreditadas);
  // investigación no tenía aprobación -> todas aprobadas para no perder horas ya reportadas.
  await sql`
    UPDATE horas_podcast_pasante h SET estado_aprobacion = 'aprobado', fecha_aprobacion = now()
    FROM videos v WHERE v.id = h.video_id AND v.aprobado_sitio = true AND h.estado_aprobacion = 'pendiente'
  `;
  await sql`
    UPDATE actividades_investigacion_pasante SET estado_aprobacion = 'aprobado', fecha_aprobacion = now()
    WHERE estado_aprobacion = 'pendiente'
  `;
  console.log('migrate-aprobacion-horas OK');
}

main().catch(err => { console.error(err); process.exit(1); });
