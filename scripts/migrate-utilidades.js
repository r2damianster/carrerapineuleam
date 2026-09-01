import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Tablas del módulo /utilidades (Acta Técnica, Oficios, Convocatorias, PAT
// Maestría, Pares Lectores). Portado de carrera-herramientas/scripts/migrate-neon.ts
// (proyecto Utilidades) al integrar ese código dentro de carreraPINE.
// CREATE TABLE IF NOT EXISTS + seed idempotente — mismo patrón que
// migrate-contribuciones.js, no toca ninguna tabla existente del Portal.

const DOCENTES_INICIALES = [
  ['Lic.', 'María Basantes Robalino', 'Mg.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Lic.', 'Gabriel Bazurto Alcívar', 'Mg.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Dr.', 'Germán Carrera Moreno', 'PhD.', 'Director de carrera', 'Pedagogía de los Idiomas Nacionales y Extranjeros', true],
  ['Lic.', 'Verónica Chávez Zambrano', 'Mg.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Lic.', 'Jorge Corral Joniaux', 'Mg.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Lic.', 'Gonzalo Farfán Corrales', 'Mg.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Lic.', 'Laura Mena Sánchez', 'Mg.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Dr.', 'Arturo Rodríguez Zambrano', 'PhD.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Dr.', 'Jhonny Villafuerte Holguín', 'PhD.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Lic.', 'Cintya Zambrano Zambrano', 'Mg.', 'Docente', 'Pedagogía de los Idiomas Nacionales y Extranjeros', false],
  ['Dr.', 'Pedro Quijije Anchundia', 'PhD.', 'Decano', 'Facultad de Educación y Turismo', false],
  ['Lic.', 'Klever Alfredo Delgado Reyes', 'Mg.', 'Director', 'Dirección de Investigación, Publicaciones y Servicio Bibliográficos - ULEAM', false],
  ['Dra.', 'Jackeline Terranova Ruiz', 'PhD.', 'Vicerrectora Académica', 'ULEAM', false],
];

const NIVELES_4 = [
  { pct: 0, label: 'No adecuado' },
  { pct: 35, label: 'Poco adecuado' },
  { pct: 70, label: 'Adecuado' },
  { pct: 100, label: 'Totalmente adecuado' },
];

function schemaTefl() {
  return {
    escala_total: 5,
    tabla_total_idx: 0,
    tablas: [
      {
        nombre: 'Rúbrica para el Trabajo Escrito',
        escala: 'peso_si_no',
        header_rows: 1,
        criterios: [
          { no: 1, texto: 'Presentación  Anillado carátula índice', peso: 0.25 },
          { no: 2, texto: 'Introducción', peso: 0.5 },
          { no: 3, texto: 'Módulo 1  Journal (bibliografía) FMU', peso: 0.75 },
          { no: 4, texto: 'Módulo 2  Journal (bibliografía) Speaking Lesson Plan (ECRIF) Anexos (Actividades para los estudiantes)', peso: 0.75 },
          { no: 5, texto: 'Módulo 3 Journal (bibliografía) Listening Lesson Plan (PDP) Anexos (Actividades para los estudiantes)', peso: 0.75 },
          { no: 6, texto: 'Módulo 4 Journal (bibliografía) Reading Lesson Plan (PDP) Anexos (Actividades para los estudiantes)', peso: 0.75 },
          { no: 7, texto: 'Módulo 5 Journal (bibliografía) Writing Lesson Plan (Preparation, Drafting, Revise, Editing, Extension) Anexos (Actividades para los estudiantes)', peso: 0.75 },
          { no: 8, texto: 'Conclusiones y Recomendaciones', peso: 0.5 },
        ],
      },
    ],
  };
}

function schemaArticuloNoPublicado() {
  return {
    escala_total: 5,
    tabla_total_idx: 0,
    tablas: [
      {
        nombre: 'Rúbrica — Artículo/Capítulo NO publicado',
        escala: 'niveles_4',
        header_rows: 2,
        niveles: NIVELES_4,
        criterios: [
          {
            no: 1, texto: 'Título y resumen', peso: 0.25,
            descriptores: {
              '0': 'El título no describe el proyecto de investigación/ intervención /implementación ejecutada.  El resumen no presenta los elementos objetivo, metodología, resultados y conclusiones.',
              '35': 'El título describe escasamente el proyecto de investigación/ intervención /implementación ejecutada.  El resumen presenta escasamente los elementos objetivo, metodología, resultados y conclusiones.',
              '70': 'El título describe de manera aceptable el proyecto de investigación/ intervención /implementación ejecutada.  El resumen presenta de manera aceptable los elementos objetivo, metodología, resultados y conclusiones.',
              '100': 'El título describe muy bien el proyecto de investigación/ intervención /implementación ejecutada.   El resumen presenta adecuadamente los elementos objetivo, metodología, resultados y conclusiones.',
            },
          },
          {
            no: 2, texto: 'Introducción. Problemática para investigar y contextualización.', peso: 1.0,
            descriptores: {
              '0': 'La introducción no presenta la problemática estudiada, ni las motivaciones de los autores. Presenta otros diferentes a los generalmente utilizados.',
              '35': 'La introducción presenta escasamente la problemática estudiada, motivaciones de los autores, el contexto y otros elementos utilizados.',
              '70': 'La introducción presenta de manera aceptable la problemática estudiada, conceptos fundamentales, motivaciones de los autores, el contexto, preguntas de investigación y otros elementos utilizados.',
              '100': 'La introducción presenta la problemática estudiada, conceptos fundamentales, motivaciones de los autores, el contexto, preguntas de investigación, objetivo y otros elementos generalmente utilizados.',
            },
          },
          {
            no: 3, texto: 'Marco teórico o revisión de literatura', peso: 0.5,
            descriptores: {
              '0': 'El marco teórico o revisión de literatura no es actualizada ni pertinente. No ha sido redactada adecuadamente y presenta fallas en las citas bibliográficas. Aplica errores de Norma APA 7 Edición.',
              '35': 'El marco teórico o revisión de literatura es actualizada, pertinente, pero no ha sido redactada adecuadamente y presenta fallas en las citas bibliográficas. Aplica errores de Norma APA 7 Edición.',
              '70': 'El marco teórico o revisión de literatura es actualizada, pertinente, pero no ha sido redactada adecuadamente. Las citas son realizadas correctamente. Aplica correctamente las normas APA 7 Edición.',
              '100': 'El marco teórico o revisión de literatura es actualizada, pertinente y redactada adecuadamente. Las citas son realizadas correctamente.   Aplica correctamente las normas APA 7 Edición.',
            },
          },
          {
            no: 4, texto: 'Metodología', peso: 0.5,
            descriptores: {
              '0': 'La metodología no es apropiada para el tipo de manuscrito. No se describen correctamente la muestra o participantes y los instrumentos utilizados no son pertinentes.',
              '35': 'La metodología es presentada de forma apropiada para el tipo de manuscrito. No se describen correctamente la muestra o participantes y los instrumentos utilizados.',
              '70': 'La metodología es apropiada para el tipo de manuscrito. Se observan debilidades al describir la muestra o participantes y los instrumentos utilizados.',
              '100': 'La metodología es clara y apropiada para el tipo de manuscrito. Se describen correctamente la muestra o participantes y los instrumentos utilizados.',
            },
          },
          {
            no: 5, texto: 'Resultados (artículos originales, estudios de casos).', peso: 1.0,
            descriptores: {
              '0': 'Los resultados no son presentados de manera adecuada y no se apoyada con figuras, tablas, gráficos estadísticos, esquemas, etc.',
              '35': 'Los resultados son presentados de manera poco clara e insuficiente. No se apoya con figuras, tablas, gráficos estadísticos, esquemas, etc.',
              '70': 'Los resultados son presentados de manera adecuada y apoyada con figuras, tablas, gráficos estadísticos, esquemas, etc.',
              '100': 'Los resultados son presentados de manera adecuada y apoyada con figuras, tablas, gráficos estadísticos, esquemas, etc.',
            },
          },
          {
            no: 6, texto: 'Discusión', peso: 1.0,
            descriptores: {
              '0': 'La discusión no se elabora de manera clara y no se hace contraste de los hallazgos con las teorías. No se añade información respeto a los hallazgos.',
              '35': 'La discusión se elabora de manera poco clara, pero si elabora contrastes de los hallazgos con las teorías. Se añade poca información respeto a los hallazgos.',
              '70': 'La discusión se elabora de manera clara, pero presenta escaso contrastes de los hallazgos con las teorías. Se añade poca información respeto a los hallazgos.',
              '100': 'La discusión se elabora de manera clara y con contrastes de los hallazgos con las teorías. Se añade información respeto a los hallazgos.',
            },
          },
          {
            no: 7, texto: 'Conclusiones', peso: 0.75,
            descriptores: {
              '0': 'La conclusión o reflexiones finales no contrastan a los objetivos propuestos. No es contundente y no hace uso eficiente del texto.',
              '35': 'La conclusión o reflexiones finales hacen poco contraste a los objetivos propuestos. Es poco contundente.',
              '70': 'La conclusión o reflexiones finales contrastan escasamente a los objetivos propuestos. Es contundente.',
              '100': 'La conclusión o reflexiones finales contrastan a los objetivos propuestos. Es contundente y hace uso eficiente del texto.',
            },
          },
        ],
      },
    ],
  };
}

function schemaArticuloPublicado() {
  return {
    escala_total: 5,
    tabla_total_idx: 0,
    tablas: [
      {
        nombre: 'Rúbrica — Artículo/Capítulo publicado',
        escala: 'niveles_especial',
        header_rows: 2,
        criterios: [
          {
            no: 1, texto: 'Articulo científico o capítulo de libro publicado', peso: 3,
            niveles: { '0': 'N/A', '35': 'N/A', '90': 'N/A', '100': 'Publicado' },
            guia: 'La carta de aceptación para publicación de la revista científica o editorial puede ser usada para evidenciar el requisito para aplicar este procedimiento.',
          },
          {
            no: 2, texto: 'Evidencias del proceso de evaluación de los lectores pares ciegos o editores de la revista científica o editorial', peso: 2,
            niveles: { '0': 'N/A', '35': 'N/A', '90': 'Evidencias del proceso según la revista seleccionada', '100': 'Evidencias del proceso según la revista seleccionada Carta de aceptación para publicación' },
            guia: 'Se acepta como evidencia los correos electrónicos indicando las mejoras solicitadas por editores o revistas científicas.',
          },
        ],
      },
    ],
  };
}

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS docentes (
      id SERIAL PRIMARY KEY,
      titulo_grado TEXT NOT NULL,
      nombre TEXT NOT NULL,
      post_grado TEXT NOT NULL,
      cargo TEXT NOT NULL,
      carrera TEXT NOT NULL DEFAULT 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      es_director BOOLEAN NOT NULL DEFAULT false
    )
  `;

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM docentes`;
  if (count === 0) {
    for (const [titulo_grado, nombre, post_grado, cargo, carrera, es_director] of DOCENTES_INICIALES) {
      await sql`
        INSERT INTO docentes (titulo_grado, nombre, post_grado, cargo, carrera, es_director)
        VALUES (${titulo_grado}, ${nombre}, ${post_grado}, ${cargo}, ${carrera}, ${es_director})
      `;
    }
    console.log(`Sembrados ${DOCENTES_INICIALES.length} docentes.`);
  } else {
    console.log(`Tabla docentes ya tiene ${count} filas, no se resiembra.`);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS modalidades_titulacion (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      requiere_subtipo BOOLEAN NOT NULL DEFAULT false
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rubricas (
      id SERIAL PRIMARY KEY,
      modalidad_id INTEGER NOT NULL REFERENCES modalidades_titulacion(id),
      slug TEXT NOT NULL UNIQUE,
      subtipo TEXT,
      schema_json JSONB NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS evaluaciones (
      id SERIAL PRIMARY KEY,
      numero_memo TEXT,
      fecha_memo DATE,
      fecha_limite DATE,
      facultad TEXT,
      carrera TEXT,
      opcion_titulacion TEXT,
      titulo_trabajo TEXT,
      estudiante TEXT,
      tutor TEXT,
      evaluador_nombre TEXT,
      evaluador_correo TEXT,
      modalidad_id INTEGER REFERENCES modalidades_titulacion(id),
      rubrica_id INTEGER REFERENCES rubricas(id),
      texto_memo TEXT,
      texto_trabajo TEXT,
      estado TEXT NOT NULL DEFAULT 'borrador',
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS evaluacion_observaciones (
      id SERIAL PRIMARY KEY,
      evaluacion_id INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
      seccion TEXT NOT NULL CHECK (seccion IN ('formal', 'fondo')),
      componente TEXT NOT NULL,
      observacion TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS evaluacion_indicadores (
      id SERIAL PRIMARY KEY,
      evaluacion_id INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
      tabla_idx INTEGER NOT NULL,
      criterio_idx INTEGER NOT NULL,
      criterio_texto TEXT NOT NULL,
      peso REAL NOT NULL DEFAULT 0,
      respuesta TEXT,
      calificacion REAL,
      comentario TEXT NOT NULL DEFAULT '',
      sugerencia_ia TEXT
    )
  `;

  console.log('Tablas listas. Sembrando catálogo...');

  const [tefl] = await sql`
    INSERT INTO modalidades_titulacion (slug, nombre, requiere_subtipo)
    VALUES ('tefl', 'TEFL Application Process', false)
    ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id
  `;
  const [articulo] = await sql`
    INSERT INTO modalidades_titulacion (slug, nombre, requiere_subtipo)
    VALUES ('articulo', 'Artículo Científico / Capítulo de Libro', true)
    ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id
  `;

  await sql`
    INSERT INTO rubricas (modalidad_id, slug, subtipo, schema_json)
    VALUES (${tefl.id}, 'tefl_completa', NULL, ${JSON.stringify(schemaTefl())}::jsonb)
    ON CONFLICT (slug) DO UPDATE SET schema_json = EXCLUDED.schema_json
  `;
  await sql`
    INSERT INTO rubricas (modalidad_id, slug, subtipo, schema_json)
    VALUES (${articulo.id}, 'articulo_no_publicado', 'no_publicado', ${JSON.stringify(schemaArticuloNoPublicado())}::jsonb)
    ON CONFLICT (slug) DO UPDATE SET schema_json = EXCLUDED.schema_json
  `;
  await sql`
    INSERT INTO rubricas (modalidad_id, slug, subtipo, schema_json)
    VALUES (${articulo.id}, 'articulo_publicado', 'publicado', ${JSON.stringify(schemaArticuloPublicado())}::jsonb)
    ON CONFLICT (slug) DO UPDATE SET schema_json = EXCLUDED.schema_json
  `;

  console.log('Migración + seed de /utilidades completados.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
