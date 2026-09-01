import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Corrige los 8 registros cargados por scripts/seed-articulos-regionales.js:
// - tipoArticulo estaba mal derivado ("Artículo Regional") — el valor real del
//   formato oficial es "Revista" (medio de publicación, columna TIPO_ARTICULO).
// - identificacionParticipante quedó vacío — el formato oficial usa esa columna
//   para el nombre del participante, no una cédula.
// - codigoPublicacion quedó vacío — el formato oficial guarda ahí el link DOI
//   (distinto de linkPublicacion, que es la página del artículo en la revista).

const fixes = [
  { match: 'Total Physical Response as a strategy', identificacionParticipante: 'Arturo Damián Rodríguez Zambrano', codigoPublicacion: 'https://doi.org/10.59155/is.v9i2.375' },
  { match: 'Identifying the Main Causes of Low Student Interaction', identificacionParticipante: 'Arturo Damián Rodríguez Zambrano', codigoPublicacion: 'https://doi.org/10.70747/cr.v5i2.1036' },
  { match: 'Microenseñanza con tecnologías emergentes', identificacionParticipante: 'Arturo Damián Rodríguez Zambrano', codigoPublicacion: 'https://doi.org/10.37811/cl_rcm.v10i1.22852' },
  { match: 'Efectividad del método TEACCH', identificacionParticipante: 'Arturo Damián Rodríguez Zambrano', codigoPublicacion: 'https://doi.org/10.56124/sapientiae.v9i19.020' },
  { match: 'Comparación del nivel de lectura funcional', identificacionParticipante: 'Arturo Damián Rodríguez Zambrano', codigoPublicacion: 'https://doi.org/10.48190/cumbres.v11n2a9' },
  { match: 'Use of Podcasts for Leadership', identificacionParticipante: 'Jhonny Saulo Villafuerte Holguín', codigoPublicacion: 'https://doi.org/10.31014/aior.1993.09.01.615' },
  { match: 'Jugar, Idear y Escribir', identificacionParticipante: 'Jhonny Saulo Villafuerte Holguín', codigoPublicacion: 'https://doi.org/10.37811/cl_rcm.v10i2.23826' },
  { match: 'Communicative Challenges and Fear of Performance', identificacionParticipante: 'María Cristina Basantes Robalino', codigoPublicacion: 'https://doi.org/10.31014/aior.1993.09.02.718' },
];

async function run() {
  for (const f of fixes) {
    const rows = await prisma.contribution.findMany({ where: { titulo: { contains: f.match } } });
    if (rows.length !== 1) {
      console.error('SKIP (no exactamente 1 match):', f.match, '->', rows.length);
      continue;
    }
    await prisma.contribution.update({
      where: { id: rows[0].id },
      data: {
        tipoArticulo: 'Revista',
        identificacionParticipante: f.identificacionParticipante,
        codigoPublicacion: f.codigoPublicacion,
      },
    });
    console.log('OK:', rows[0].id, '-', f.match);
  }
}

run()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
