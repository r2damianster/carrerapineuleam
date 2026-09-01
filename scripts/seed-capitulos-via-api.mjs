import { signSession, ARTURO_SESSION, postContribucion } from './_lib-sign-session.mjs';

const PROYECTO_INTERNACIONALIZACION =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.';
const FILIACION = 'Universidad Laica Eloy Alfaro de Manabí';
// Tal como viene en la plantilla — distinta de la línea "Educación y Nuevos
// Escenarios de la Formación Profesional" usada en el resto de registros y en
// el dropdown del wizard. Se inserta literal, ver aviso al usuario.
const LINEA_CAPITULOS = 'Educación y formación de profesionales';

const LIBRO_INNOVACIONES = 'INNOVACIONES EDUCATIVAS: Experiencias de vinculación social, prácticas preprofesionales, proyectos de investigación';
const LIBRO_PODCAST = 'Podcast: An educational innovation in foreign language instruction';

const capitulos = [
  {
    codigoPublicacion: 'https://doi.org/10.47189/book20260420',
    tituloCapitulo: 'Estrategias de Orientación y Movilidad en niño con discapacidad visual e intelectual: Estudio de Caso',
    tituloLibro: LIBRO_INNOVACIONES,
    isbn: '978-9942-614-37-7',
    editorCompilador: 'UTEG',
    paginas: '118-128',
    totalCapituloLibro: 13,
  },
  {
    codigoPublicacion: 'https://doi.org/10.47189/book20260420',
    tituloCapitulo: 'Habilidades comunicativas léxico-semánticas en trastornos espectro autista: un estudio de caso',
    tituloLibro: LIBRO_INNOVACIONES,
    isbn: '978-9942-614-37-7',
    editorCompilador: 'UTEG',
    paginas: '129-138',
    totalCapituloLibro: 14,
  },
  {
    codigoPublicacion: 'https://libros.uleam.edu.ec/wp-content/uploads/2026/06/PUB-2026-018-PODCAST-DIAGRAMAR.pdf',
    tituloCapitulo: 'Best Practices in the Use of Podcasts as a Language Learning and Practice Resource',
    tituloLibro: LIBRO_PODCAST,
    isbn: '978-9942-681-94-2',
    editorCompilador: 'Ediciones Uleam',
    paginas: '89-96',
    totalCapituloLibro: 6,
  },
];

async function run() {
  const cookieValue = await signSession(ARTURO_SESSION);
  for (const c of capitulos) {
    const payload = {
      tipoPublicacion: 'CAPITULO_LIBRO',
      titulo: c.tituloLibro,
      tituloLibro: c.tituloLibro,
      tituloCapitulo: c.tituloCapitulo,
      lineaInvestigacion: LINEA_CAPITULOS,
      fechaPublicacion: '2026-05-01',
      campoDetallado: 'Educación',
      estado: 'PUBLICADO',
      codigoPublicacion: c.codigoPublicacion,
      proyecto: PROYECTO_INTERNACIONALIZACION,
      isbn: c.isbn,
      editorCompilador: c.editorCompilador,
      paginas: c.paginas,
      totalCapituloLibro: c.totalCapituloLibro,
      filiacion: FILIACION,
      identificacionParticipante: 'Arturo Damián Rodríguez Zambrano',
      participacion: 'Coautor',
      authors: [{ authorName: 'Arturo Damián Rodríguez Zambrano', order: 1, isCarreraAuthor: true, esEstudiante: false }],
    };
    const r = await postContribucion(cookieValue, payload);
    console.log(r.status, c.tituloCapitulo.slice(0, 50), '->', r.ok ? `OK id=${r.body.id}` : JSON.stringify(r.body));
  }
}

run().catch(e => { console.error(e); process.exit(1); });
