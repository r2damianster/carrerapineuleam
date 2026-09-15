// Inserta una fila en `videos` a partir de un video ya subido a YouTube (vía
// iniciarSesionReanudable, ver lib/youtube.ts) — nace con aprobado_sitio=false,
// pendiente de aprobación en /admin/videos. Compartido entre POST /api/videos
// (subida desde /portal/subir-video) y POST /api/difusion (subida integrada en
// Difusión/Eventos, tipo "podcast") para no duplicar la lógica.
//
// areaSustantiva/proyectoIds (Sesión 38): el área elegida en el formulario
// (docencia/investigacion/vinculacion) determina el proyecto específico, pero
// TODO podcast se suma además al proyecto de Innovaciones Pedagógicas e
// Internacionalización — proyectoIds siempre incluye 'internacionalizacion'
// salvo que ya sea el elegido. participantesEstudiantes/invitados*/
// audienciaAlcanzada se guardan en la fila del video (no se calculan horas
// acá) — alimentan el cálculo de horas acreditables (lib/horasPodcast.ts)
// recién cuando el profesor aprueba el video en /admin/videos
// (app/api/videos/[id]/route.ts), no al subirlo. Antes se insertaban al
// subir, contando aunque el video siguiera pendiente de aprobación — el
// pasante veía horas que en realidad el profesor todavía no había validado.
//
// Sesión 40: las horas ya NO dependen de areaSustantiva === 'vinculacion' —
// un pasante puede adscribir su podcast a cualquier área (docencia,
// investigación o vinculación), y de todos modos se acredita como horas de
// Vinculación en cuanto queda marcado como participante. Antes, elegir mal
// el área (ej. "investigación" por error) dejaba a ese pasante sin horas —
// caso real: video_1789480797649, corregido a mano en Neon.
export async function registrarVideoPropuesto(
  sql: any,
  {
    usuarioId,
    youtubeVideoId,
    title,
    description,
    category,
    tags,
    areaSustantiva,
    proyectoId,
    participantesEstudiantes,
    invitadosInternos,
    invitadosExternos,
    audienciaAlcanzada,
  }: {
    usuarioId: number;
    youtubeVideoId: string;
    title: string;
    description?: string | null;
    category: string;
    tags?: string[];
    areaSustantiva?: string | null;
    proyectoId?: string | null;
    participantesEstudiantes?: number[];
    invitadosInternos?: string[];
    invitadosExternos?: string[];
    audienciaAlcanzada?: number;
  }
) {
  const id = `video_${Date.now()}`;
  const url_final = `https://youtu.be/${youtubeVideoId}`;
  const proyectoIds = proyectoId
    ? Array.from(new Set([proyectoId, 'internacionalizacion']))
    : null;

  const [nuevo] = await sql`
    INSERT INTO videos
      (id, title, youtube_url, embed_id, description, category, "order", is_featured, tags, aprobado_sitio, propuesto_por,
       area_sustantiva, proyecto_id, participantes_estudiantes, invitados_internos, invitados_externos, audiencia_alcanzada)
    VALUES
      (${id}, ${title}, ${url_final}, ${youtubeVideoId}, ${description || null}, ${category}, 0, false, ${tags || []}, false, ${usuarioId},
       ${areaSustantiva || null}, ${proyectoIds}, ${participantesEstudiantes || []}, ${invitadosInternos || []}, ${invitadosExternos || []}, ${audienciaAlcanzada || 0})
    RETURNING *
  `;

  return nuevo;
}
