import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Migración: video_categories + videos (Podcast) estáticos -> Neon.
// youtube_url/embed_id/published_date pasan a NULLABLE (antes NOT NULL) —
// un episodio de podcast ahora se puede registrar solo con metadata, el link
// se completa después al editar (pedido explícito del usuario, Sesión 24).

const CATEGORIES = [
  { id: 'cat_1', name: 'Educa PINE', slug: 'educa-pine', description: 'Episodios del podcast Educa PINE sobre pedagogía e innovación educativa', order: 1, is_active: true, created: '2026-04-08T00:00:00Z' },
  { id: 'cat_2', name: 'Voces Fuera del Aula', slug: 'voces-fuera-del-aula', description: 'Desafíos y experiencias en el aprendizaje — podcast Voces Fuera del Aula', order: 2, is_active: true, created: '2026-02-26T00:00:00Z' },
  { id: 'cat_3', name: 'PsicoEducarte', slug: 'psicoeducarte', description: 'Programa PsicoEducarte — colaboración interdisciplinaria entre Psicología Educativa y el proyecto PINE', order: 3, is_active: true, created: '2026-06-05T00:00:00Z' },
  { id: 'cat_4', name: 'Más Allá del Lienzo', slug: 'mas-alla-del-lienzo', description: 'Debate interdisciplinario entre Pedagogía de Idiomas y Artes — arte, ética y cultura', order: 4, is_active: true, created: '2026-07-14T00:00:00Z' },
];

const VIDEOS = [
  { id: 'video_1', title: 'Adicción a las redes sociales', youtube_url: 'https://youtu.be/Ujmhwl-0Epk', description: 'Podcast Educa PINE — Episodio sobre la adicción a las redes sociales y su impacto en el contexto educativo. Producto de la cátedra de Investigación Educativa: Enfoques y Técnicas.', embed_id: 'Ujmhwl-0Epk', category: 'cat_1', published_date: '2026-04-08', order: 1, is_featured: true, tags: ['docencia'], created: '2026-04-08T00:00:00Z' },
  { id: 'video_2', title: 'Comparaciones en las redes sociales', youtube_url: 'https://youtu.be/bZWv7zNWHUw', description: 'Podcast Educa PINE — Episodio sobre el efecto de las comparaciones sociales en plataformas digitales. Producto de la cátedra de Investigación Educativa: Enfoques y Técnicas.', embed_id: 'bZWv7zNWHUw', category: 'cat_1', published_date: '2026-04-08', order: 2, is_featured: true, tags: ['docencia'], created: '2026-04-08T00:00:00Z' },
  { id: 'video_3', title: 'Ansiedad en las redes sociales', youtube_url: 'https://youtu.be/lZEHjvMxdE8', description: 'Podcast Educa PINE — Episodio sobre la ansiedad generada por el uso de redes sociales.', embed_id: 'lZEHjvMxdE8', category: 'cat_1', published_date: '2026-04-08', order: 3, is_featured: false, tags: ['docencia'], created: '2026-04-08T00:00:00Z' },
  { id: 'video_4', title: 'Cursos vacacionales: ¿El propósito es realmente el aprendizaje?', youtube_url: 'https://youtu.be/XId0WxjAux0', description: 'Podcast Voces Fuera del Aula — Reflexión sobre la finalidad pedagógica de los cursos vacacionales.', embed_id: 'XId0WxjAux0', category: 'cat_2', published_date: '2026-02-26', order: 1, is_featured: true, tags: ['investigacion'], created: '2026-02-26T00:00:00Z' },
  { id: 'video_5', title: 'La procrastinación, el enemigo silencioso de nuestros sueños', youtube_url: 'https://youtu.be/firVFL67s04', description: 'Podcast Educa PINE — Episodio sobre la procrastinación y su impacto en el rendimiento académico y personal. Producto del proyecto de vinculación con la sociedad de la carrera de Pedagogía de Idiomas Nacionales y Extranjeros.', embed_id: 'firVFL67s04', category: 'cat_1', published_date: '2026-05-27', order: 4, is_featured: true, tags: ['vinculacion'], created: '2026-05-27T00:00:00Z' },
  { id: 'video_6', title: 'PsicoEducarte | El Rol del Psicólogo Educativo', youtube_url: 'https://youtu.be/JFUN-l6fF98', description: 'PsicoEducarte — Contribución interdisciplinaria al proyecto PINE: el rol del psicólogo educativo en el contexto escolar.', embed_id: 'JFUN-l6fF98', category: 'cat_3', published_date: '2026-06-05', order: 1, is_featured: true, tags: ['investigacion'], created: '2026-06-05T00:00:00Z' },
  { id: 'video_7', title: 'EducaPine | Unknown things about Ecuador', youtube_url: 'https://youtu.be/qJO8F9lQYkE', description: 'Podcast Educa PINE — Producto de docencia: datos curiosos y poco conocidos sobre Ecuador.', embed_id: 'qJO8F9lQYkE', category: 'cat_1', published_date: '2026-06-04', order: 5, is_featured: false, tags: ['docencia'], created: '2026-06-04T00:00:00Z' },
  { id: 'video_8', title: 'EducaPiNE | El temor al error: ¿Por qué nos callamos en clases?', youtube_url: 'https://youtu.be/sbkPClatf4M', description: 'Podcast Educa PINE — Episodio sobre el miedo a equivocarse y su efecto en la participación estudiantil. Producto del proyecto de vinculación con la sociedad de la carrera de Pedagogía de Idiomas Nacionales y Extranjeros.', embed_id: 'sbkPClatf4M', category: 'cat_1', published_date: '2026-06-02', order: 6, is_featured: false, tags: ['vinculacion'], created: '2026-06-02T00:00:00Z' },
  { id: 'video_9', title: 'EDUCAPINE | Vinculación y experiencias de los estudiantes de PINE', youtube_url: 'https://youtu.be/Nj2TFVY7GFs', description: 'Podcast Educa PINE — Estudiantes de la carrera de Pedagogía de Idiomas Nacionales y Extranjeros comparten sus experiencias y reflexiones en el marco del proyecto de vinculación con la sociedad.', embed_id: 'Nj2TFVY7GFs', category: 'cat_1', published_date: '2026-06-23', order: 7, is_featured: false, tags: ['vinculacion'], created: '2026-06-23T00:00:00Z' },
  { id: 'video_10', title: 'EducaPine | Innovación Educativa y las nuevas metodologías', youtube_url: 'https://youtu.be/DcH6yM8jaaU', description: 'Podcast Educa PINE — Episodio sobre innovación educativa y las nuevas metodologías de enseñanza-aprendizaje. Producto del proyecto de vinculación con la sociedad de la carrera de Pedagogía de Idiomas Nacionales y Extranjeros.', embed_id: 'DcH6yM8jaaU', category: 'cat_1', published_date: '2026-06-23', order: 8, is_featured: false, tags: ['vinculacion', 'innovacion'], created: '2026-06-23T00:00:00Z' },
  { id: 'video_11', title: 'EducaPiNE | El tamaño de lo que sentimos', youtube_url: 'https://youtu.be/GhB8tWW1qoY', description: 'Podcast Educa PINE — Episodio dedicado al libro "El tamaño de lo que sentimos", publicado por miembros del proyecto en junio de 2026.', embed_id: 'GhB8tWW1qoY', category: 'cat_1', published_date: '2026-06-23', order: 9, is_featured: false, tags: ['vinculacion', 'libro', 'publicacion'], created: '2026-06-23T00:00:00Z' },
  { id: 'video_12', title: 'Voces Fuera del Aula | Between reading and watching', youtube_url: 'https://youtu.be/35_g-1C6zHk', description: 'Podcast Voces Fuera del Aula — Episodio sobre lectura y medios audiovisuales en el aprendizaje.', embed_id: '35_g-1C6zHk', category: 'cat_2', published_date: '2026-06-24', order: 10, is_featured: false, tags: ['docencia'], created: '2026-06-24T00:00:00Z' },
  { id: 'video_13', title: 'EDUCAPINE | De ULEAM a Disney: Historias que transforman', youtube_url: 'https://youtu.be/97x9RMnVdMY', description: 'Podcast Educa PINE — Episodio sobre experiencias transformadoras de estudiantes de PINE, desde ULEAM hacia escenarios internacionales.', embed_id: '97x9RMnVdMY', category: 'cat_1', published_date: '2026-06-24', order: 11, is_featured: false, tags: ['vinculacion', 'internacionalizacion'], created: '2026-06-24T00:00:00Z' },
  { id: 'video_14', title: 'Voces Fuera del Aula | ¿Es mejor muchos o pocos amigos?', youtube_url: 'https://youtu.be/oVvDY7nGv44', description: 'Podcast Voces Fuera del Aula — Episodio sobre la cantidad y calidad de las amistades en el contexto educativo.', embed_id: 'oVvDY7nGv44', category: 'cat_2', published_date: '2026-07-03', order: 13, is_featured: false, tags: ['vinculacion', 'amistad', 'reflexion'], created: '2026-07-03T00:00:00Z' },
  { id: 'video_15', title: 'Más allá del Lienzo: ¿Se puede separar la obra del artista? Un debate sobre arte, ética y cultura', youtube_url: 'https://youtu.be/AyxDAmJGDDU', description: 'Debate interdisciplinario sobre arte, ética y cultura. ¿Es posible separar la obra del artista? Colaboración entre Pedagogía de Idiomas y Artes del proyecto PINE.', embed_id: 'AyxDAmJGDDU', category: 'cat_4', published_date: '2026-07-14', order: 12, is_featured: false, tags: ['investigacion', 'arte', 'ética', 'cultura', 'interdisciplinario'], created: '2026-07-14T00:00:00Z' },
  { id: 'video_16', title: 'Voces fuera del aula: ¿El dinero compra la felicidad? ¿Qué haría si tuvieras 24 horas sin internet?', youtube_url: 'https://youtu.be/1RZLqjS_RXA?si=pkZB0PcUiOAo4ccE', description: 'Podcast Voces Fuera del Aula — Episodio sobre felicidad, dinero y la dependencia de internet en la sociedad contemporánea.', embed_id: '1RZLqjS_RXA', category: 'cat_2', published_date: '2026-07-14', order: 14, is_featured: false, tags: ['vinculacion', 'dinero', 'felicidad', 'internet', 'reflexion'], created: '2026-07-14T00:00:00Z' },
  { id: 'video_17', title: 'Más allá del lienzo: ¿El arte sigue siendo arte si lo crea una Inteligencia Artificial? Episodio 2', youtube_url: 'https://youtu.be/TDJYBXy5Tb4', description: 'Más Allá del Lienzo — Episodio 2 del debate interdisciplinario entre Pedagogía de Idiomas y Artes: reflexión crítica sobre la Inteligencia Artificial en la creación artística, sus implicaciones éticas y culturales.', embed_id: 'TDJYBXy5Tb4', category: 'cat_4', published_date: '2026-07-21', order: 13, is_featured: false, tags: ['investigacion', 'arte', 'ética', 'inteligencia-artificial', 'cultura', 'interdisciplinario'], created: '2026-07-21T00:00:00Z' },
  { id: 'video_18', title: 'Voces fuera del Aula | El desamor, ¿cómo nos afecta en la vida universitaria?', youtube_url: 'https://youtu.be/QN1hiC2eZv8', description: 'Podcast Voces Fuera del Aula — Episodio reflexivo sobre el desamor, sus impactos emocionales y cómo afecta la vida académica y personal de los estudiantes universitarios.', embed_id: 'QN1hiC2eZv8', category: 'cat_2', published_date: '2026-07-21', order: 15, is_featured: false, tags: ['vinculacion', 'desamor', 'emociones', 'vida-universitaria', 'reflexion'], created: '2026-07-21T00:00:00Z' },
  { id: 'video_19', title: 'Unpopular Opinions and uncomfortable truths', youtube_url: 'https://youtu.be/8i10ze45VuQ', description: 'Podcast Educa PINE — Episodio resultado de prácticas de aula donde se discuten opiniones impopulares e incómodas verdades. Producto del proyecto de vinculación con la sociedad de la carrera de Pedagogía de Idiomas Nacionales y Extranjeros.', embed_id: '8i10ze45VuQ', category: 'cat_1', published_date: '2026-08-03', order: 10, is_featured: false, tags: ['docencia', 'debate', 'pensamiento-critico'], created: '2026-08-03T00:00:00Z' },
  { id: 'video_20', title: 'Más allá del Lienzo: Apropiación Cultural en la Industria de la Moda. Episodio 3', youtube_url: 'https://youtu.be/0VffZ_RwlRU', description: 'Debate interdisciplinario entre Pedagogía de Idiomas y Artes: reflexión crítica sobre la apropiación cultural en la industria de la moda, sus implicaciones éticas y culturales. Colaboración PINE.', embed_id: '0VffZ_RwlRU', category: 'cat_4', published_date: '2026-08-03', order: 14, is_featured: false, tags: ['investigacion', 'arte', 'ética', 'cultura', 'moda', 'interdisciplinario'], created: '2026-08-03T00:00:00Z' },
];

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS video_categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      description TEXT, cover_image TEXT, "order" INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created TIMESTAMPTZ NOT NULL DEFAULT now(), updated TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY, title TEXT NOT NULL,
      youtube_url TEXT, embed_id TEXT,
      description TEXT, category TEXT NOT NULL REFERENCES video_categories(id),
      published_date DATE, "order" INTEGER NOT NULL DEFAULT 0,
      is_featured BOOLEAN NOT NULL DEFAULT false, tags TEXT[],
      created TIMESTAMPTZ NOT NULL DEFAULT now(), updated TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  for (const c of CATEGORIES) {
    await sql`
      INSERT INTO video_categories (id, name, slug, description, "order", is_active, created, updated)
      VALUES (${c.id}, ${c.name}, ${c.slug}, ${c.description}, ${c.order}, ${c.is_active}, ${c.created}, ${c.created})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const v of VIDEOS) {
    await sql`
      INSERT INTO videos (id, title, youtube_url, embed_id, description, category, published_date, "order", is_featured, tags, created, updated)
      VALUES (${v.id}, ${v.title}, ${v.youtube_url}, ${v.embed_id}, ${v.description}, ${v.category}, ${v.published_date}, ${v.order}, ${v.is_featured}, ${v.tags}, ${v.created}, ${v.created})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  const cCount = await sql`SELECT count(*) FROM video_categories`;
  const vCount = await sql`SELECT count(*) FROM videos`;
  console.log('video_categories:', cCount[0].count, '| videos:', vCount[0].count);
}
run().catch(e => { console.error(e); process.exit(1); });
