const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Reemplaza el uso de `origen` como discriminador de DÓNDE se muestra una
// fila (antes: NewsSection leía solo origen='noticia', ActivityGallery solo
// origen='actividad' — mutuamente excluyentes). Decisión del usuario: un
// mismo evento puede ser noticia Y actividad a la vez, y el admin decide en
// qué secciones se publica cada uno — no depende de cómo se creó el registro.
//
// `origen` se queda como registro histórico de creación (no se borra, no se
// usa más para filtrar qué se muestra). publicar_noticias/publicar_actividades
// son los nuevos flags que sí controlan visibilidad pública.
//
// De paso corrige un bug real: los registros origen='difusion' aprobados
// (vía /vinculacion/difusion, /gestion-carrera) nunca aparecían en ninguna
// sección pública porque ninguna leía origen='difusion' — quedaban
// invisibles para siempre tras aprobarse. Ahora nacen visibles en Actividades.

async function main() {
  await sql`
    ALTER TABLE actividades_difusion
      ADD COLUMN IF NOT EXISTS publicar_noticias BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS publicar_actividades BOOLEAN NOT NULL DEFAULT false
  `;

  await sql`UPDATE actividades_difusion SET publicar_noticias = true WHERE origen = 'noticia'`;
  await sql`UPDATE actividades_difusion SET publicar_actividades = true WHERE origen = 'actividad'`;
  await sql`UPDATE actividades_difusion SET publicar_actividades = true WHERE origen = 'difusion' AND aprobado_sitio = true`;

  console.log('publicar_noticias/publicar_actividades agregadas y pobladas desde origen existente.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
