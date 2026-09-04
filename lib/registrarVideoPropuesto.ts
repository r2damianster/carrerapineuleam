// Inserta una fila en `videos` a partir de un video ya subido a YouTube (vía
// iniciarSesionReanudable, ver lib/youtube.ts) — nace con aprobado_sitio=false,
// pendiente de aprobación en /admin/videos. Compartido entre POST /api/videos
// (subida desde /portal/subir-video) y POST /api/difusion (subida integrada en
// Difusión/Eventos, tipo "podcast") para no duplicar la lógica.
export async function registrarVideoPropuesto(
  sql: any,
  {
    usuarioId,
    youtubeVideoId,
    title,
    description,
    category,
    tags,
  }: {
    usuarioId: number;
    youtubeVideoId: string;
    title: string;
    description?: string | null;
    category: string;
    tags?: string[];
  }
) {
  const id = `video_${Date.now()}`;
  const url_final = `https://youtu.be/${youtubeVideoId}`;
  const [nuevo] = await sql`
    INSERT INTO videos (id, title, youtube_url, embed_id, description, category, "order", is_featured, tags, aprobado_sitio, propuesto_por)
    VALUES (${id}, ${title}, ${url_final}, ${youtubeVideoId}, ${description || null}, ${category}, 0, false, ${tags || []}, false, ${usuarioId})
    RETURNING *
  `;
  return nuevo;
}
