import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PROYECTO_INTERNACIONALIZACION =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.';
const FILIACION = 'Universidad Laica Eloy Alfaro de Manabí';
const LINEA = 'Educación y Nuevos Escenarios de la Formación Profesional';

// ESTADO no viene en esta plantilla (solo aplica a artículos) — los 3 libros ya
// están publicados y en el sitio público (lib/data.ts pub_71/pub_64/pub_3), se
// asume PUBLICADO.
const libros = [
  {
    codigoPublicacion: '78-9942-681-97-3', // así viene en la plantilla — sin el "9" inicial, probable typo vs el ISBN (978-...)
    titulo: 'El tamaño de lo que sentimos: Libro ilustrado sobre el complejo de inferioridad',
    isbn: '978-9942-681-97-3',
    fechaPublicacion: '2026-06-01',
    identificacionParticipante: 'Arturo Damián Rodríguez Zambrano',
  },
  {
    codigoPublicacion: '978-9942-681-94-2',
    titulo: 'Podcast: An educational innovation in foreign language instruction',
    isbn: '978-9942-681-94-2',
    fechaPublicacion: '2026-05-01',
    identificacionParticipante: 'Jhonny Villafuerte Holguín',
  },
  {
    codigoPublicacion: '978-9942-614-37-7',
    titulo: 'INNOVACIONES EDUCATIVAS: Experiencias de vinculación social, prácticas preprofesionales, proyectos de investigación',
    isbn: '978-9942-614-37-7',
    fechaPublicacion: '2026-04-01',
    identificacionParticipante: 'Jhonny Villafuerte Holguín',
  },
];

async function run() {
  for (const l of libros) {
    const created = await prisma.contribution.create({
      data: {
        codigo_ies: 'ULEAM',
        facultad: 'Facultad de Educación y Turismo',
        carrera: 'Pedagogía de los Idiomas Nacionales y Extranjeros',
        tipoPublicacion: 'LIBRO',
        codigoPublicacion: l.codigoPublicacion,
        proyecto: PROYECTO_INTERNACIONALIZACION,
        titulo: l.titulo,
        tituloLibro: l.titulo,
        isbn: l.isbn,
        fechaPublicacion: new Date(l.fechaPublicacion),
        campoDetallado: 'Educación',
        estado: 'PUBLICADO',
        revisadoPares: true,
        filiacion: FILIACION,
        identificacionParticipante: l.identificacionParticipante,
        participacion: 'Coautor',
        lineaInvestigacion: LINEA,
        authors: {
          create: [{ authorName: l.identificacionParticipante, order: 1, isCarreraAuthor: true, esEstudiante: false }],
        },
      },
    });
    console.log('OK:', created.id, '-', l.titulo.slice(0, 60));
  }
}

run()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
