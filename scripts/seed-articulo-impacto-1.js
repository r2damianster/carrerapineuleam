import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const created = await prisma.contribution.create({
    data: {
      codigo_ies: 'ULEAM',
      facultad: 'Facultad de Educación y Turismo',
      carrera: 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      tipoPublicacion: 'ARTICULO_ALTO_IMPACTO',
      tipoArticulo: 'Investigación',
      codigoPublicacion: 'https://doi.org/10.36097/rsan.v1i65.3768',
      proyecto: 'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.',
      titulo: 'Condicionantes institucionales en el uso de tecnologías en el aula: Una aproximación desde el análisis multivariado.',
      nombreRevista: 'Revista San Gregorio',
      issn: 'e-ISSN 2528-7907 / p-ISSN 1390-7247',
      baseDatosIndexada: 'Wmerging Web of Science',
      fechaPublicacion: new Date('2026-03-31'),
      campoDetallado: 'Tecnología educativa',
      estado: 'PUBLICADO',
      linkPublicacion: 'https://revista.sangregorio.edu.ec/index.php/REVISTASANGREGORIO/article/view/3768',
      linkRevista: 'https://revista.sangregorio.edu.ec/index.php/REVISTASANGREGORIO/index',
      filiacion: 'Universidad Laica Eloy Alfaro de Manabí',
      identificacionParticipante: 'Jhonny Saulo Villafuerte Holguín',
      categoria: 'AGREGADO_III',
      participacion: 'Coautor',
      cuartil: 'Q4',
      lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
      authors: {
        create: [{ authorName: 'Jhonny Saulo Villafuerte Holguín', order: 1, isCarreraAuthor: true, esEstudiante: false }],
      },
    },
  });
  console.log('OK:', created.id, '-', created.titulo);
}

run()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
