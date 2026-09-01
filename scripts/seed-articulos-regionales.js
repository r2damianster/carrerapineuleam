import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Carga 8 artículos regionales reales, vía el mismo Prisma Client que usa
// app/api/contribuciones/route.ts en producción — prueba real de que el
// esquema/enum acepta estos datos (Sesión 24). No pasa por HTTP/zod porque
// no hay sesión de navegador disponible desde aquí, pero sí por el mismo
// modelo Prisma y la misma base (DATABASE_URL de .env.local == producción).

const PROYECTO_INTERNACIONALIZACION =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.';

const FILIACION = 'Universidad Laica Eloy Alfaro de Manabí';
const LINEA = 'Educación y Nuevos Escenarios de la Formación Profesional';

const articulos = [
  {
    titulo: 'Total Physical Response as a strategy to improve the speaking skills of beginners EFL students in a rural Ecuadorian school.',
    nombreRevista: 'Sinergias Educativas',
    issn: '2661-6661',
    baseDatosIndexada: 'Erihplus',
    fechaPublicacion: '2026-07-01',
    linkPublicacion: 'https://revista-imaginariosocial.com/index.php/es/article/view/375',
    linkRevista: 'https://revista-imaginariosocial.com/index.php/es',
    proyecto: null,
    autor: 'Arturo Damián Rodríguez Zambrano',
    categoria: 'AUXILIAR_II',
  },
  {
    titulo: 'Identifying the Main Causes of Low Student Interaction in EFL Speaking Classes',
    nombreRevista: 'Revista Ciencia y Reflexión',
    issn: '3045-5537',
    baseDatosIndexada: 'Dialnet',
    fechaPublicacion: '2026-06-14',
    linkPublicacion: 'https://cienciayreflexion.org/index.php/Revista/article/view/1036',
    linkRevista: 'https://cienciayreflexion.org/index.php/Revista',
    proyecto: null,
    autor: 'Arturo Damián Rodríguez Zambrano',
    categoria: 'AUXILIAR_II',
  },
  {
    titulo: 'Microenseñanza con tecnologías emergentes para el mejoramiento de las macrodestreza lingüística de la expresión Oral',
    nombreRevista: 'Ciencia Latina Revista Multidisciplinar',
    issn: '2707-2215',
    baseDatosIndexada: 'Latindex',
    fechaPublicacion: '2026-03-17',
    linkPublicacion: 'https://ciencialatina.org/index.php/cienciala/article/view/22852',
    linkRevista: 'https://ciencialatina.org/index.php/cienciala',
    proyecto: null,
    autor: 'Arturo Damián Rodríguez Zambrano',
    categoria: 'AUXILIAR_II',
  },
  {
    titulo: 'Efectividad del método TEACCH en habilidades sociales de niños con trastorno del espectro autista',
    nombreRevista: 'Revista Científica Multidisciplinaria SAPIENTIAE',
    issn: '2600-6030',
    baseDatosIndexada: 'Latindex',
    fechaPublicacion: '2026-01-15',
    linkPublicacion: 'https://publicacionescd.uleam.edu.ec/index.php/sapientiae/article/view/1701',
    linkRevista: 'https://publicacionescd.uleam.edu.ec/index.php/sapientiae/',
    proyecto: null,
    autor: 'Arturo Damián Rodríguez Zambrano',
    categoria: 'AUXILIAR_II',
  },
  {
    titulo: 'Comparación del nivel de lectura funcional en estudiante de segundo y cuarto grado de E.G.B.',
    nombreRevista: 'Revista Científica Cumbres',
    issn: '1390-3365',
    baseDatosIndexada: 'Erihplus',
    fechaPublicacion: '2026-01-05',
    linkPublicacion: 'https://revistas.utmachala.edu.ec/revistas/index.php/Cumbres/article/view/913',
    linkRevista: 'https://revistas.utmachala.edu.ec/revistas/index.php/Cumbres/',
    proyecto: null,
    autor: 'Arturo Damián Rodríguez Zambrano',
    categoria: 'AUXILIAR_II',
  },
  {
    titulo: 'Use of Podcasts for Leadership and Emotional Intelligence Development: A Review Study.',
    nombreRevista: 'Education Quarterly Reviews',
    issn: '2621-5799',
    baseDatosIndexada: 'Ebsco',
    fechaPublicacion: '2026-01-14',
    linkPublicacion: 'https://www.asianinstituteofresearch.org/_files/ugd/ed8b62_d1890c5a4bd945e8adaf6cefbcac7299.pdf',
    linkRevista: 'https://www.asianinstituteofresearch.org/post/use-of-podcasts-for-leadership-and-emotional-intelligence-development-a-review-study',
    proyecto: PROYECTO_INTERNACIONALIZACION,
    autor: 'Jhonny Saulo Villafuerte Holguín',
    categoria: 'AGREGADO_III',
  },
  {
    titulo: 'Jugar, Idear y Escribir: Estrategias Lúdico-Creativas para Despertar la Escritura de Microcuentos en Educación General Básica.',
    nombreRevista: 'Ciencia Latina Revista Multidisciplinar',
    issn: '2707-2207',
    baseDatosIndexada: 'Latindex, MIIAR',
    fechaPublicacion: '2026-06-14',
    linkPublicacion: 'https://ciencialatina.org/index.php/cienciala/article/view/23826',
    linkRevista: 'https://ciencialatina.org/index.php/cienciala',
    proyecto: PROYECTO_INTERNACIONALIZACION,
    autor: 'Jhonny Saulo Villafuerte Holguín',
    categoria: 'AGREGADO_III',
  },
  {
    titulo: 'Communicative Challenges and Fear of Performance among Pre-service English Teachers: The Role of Preparation',
    nombreRevista: 'Education Quarterly Reviews',
    issn: '2621-5799',
    baseDatosIndexada: 'Latindex',
    fechaPublicacion: '2026-06-29',
    linkPublicacion: 'https://www.asianinstituteofresearch.org/EQRarchives/communicative-challenges-and-fear-of-performance-among-pre-service-english-teachers%3A-the-role-of-preparation',
    linkRevista: null,
    proyecto: PROYECTO_INTERNACIONALIZACION,
    autor: 'María Cristina Basantes Robalino',
    categoria: null,
  },
];

async function run() {
  for (const a of articulos) {
    const created = await prisma.contribution.create({
      data: {
        codigo_ies: 'ULEAM',
        facultad: 'Facultad de Educación y Turismo',
        carrera: 'Pedagogía de los Idiomas Nacionales y Extranjeros',
        tipoPublicacion: 'ARTICULO_REGIONAL',
        tipoArticulo: 'Artículo Regional',
        proyecto: a.proyecto,
        titulo: a.titulo,
        nombreRevista: a.nombreRevista,
        issn: a.issn,
        baseDatosIndexada: a.baseDatosIndexada,
        fechaPublicacion: new Date(a.fechaPublicacion),
        campoDetallado: 'Educación',
        estado: 'PUBLICADO',
        linkPublicacion: a.linkPublicacion,
        linkRevista: a.linkRevista,
        filiacion: FILIACION,
        categoria: a.categoria,
        participacion: 'Coautor',
        lineaInvestigacion: LINEA,
        authors: {
          create: [{ authorName: a.autor, order: 1, isCarreraAuthor: true, esEstudiante: false }],
        },
      },
    });
    console.log('OK:', created.id, '-', a.titulo.slice(0, 60));
  }
}

run()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
