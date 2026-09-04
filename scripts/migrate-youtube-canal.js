import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Autorización del canal de YouTube donde se suben los podcasts propuestos por
// profesores (app/portal/subir-video). Tabla de una sola fila (id=1 fijo) — solo
// hay un canal. `refresh_token` se obtiene una vez vía OAuth (app/api/youtube/
// oauth-callback) y se usa para pedir access_tokens nuevos en cada subida
// (lib/youtube.ts:obtenerAccessToken). Autorizado por quien conecte el canal
// desde /admin/videos (requiere modulos_acceso:contenido_sitio).

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS youtube_canal_auth (
      id INTEGER PRIMARY KEY DEFAULT 1,
      refresh_token TEXT NOT NULL,
      channel_id TEXT,
      channel_title TEXT,
      autorizado_por INTEGER REFERENCES usuarios(id),
      autorizado_en TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT solo_una_fila CHECK (id = 1)
    )
  `;
  console.log('Migración completada: tabla youtube_canal_auth');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
