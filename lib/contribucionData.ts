import type { z } from 'zod';
import type { contribucionSchema } from '@/lib/contribucionSchema';

type DatosContribucion = z.infer<typeof contribucionSchema>;

// Columnas de Contribution a partir de lo validado por contribucionSchema.
// Compartido entre POST /api/contribuciones (docente con sesión) y
// POST /api/enlaces-contribucion/[token] (envío externo por QR) para que ambos
// guarden exactamente los mismos campos. No incluye authors, creadoPorId ni origen.
export function datosContribucion(data: DatosContribucion, fechaPublicacion: Date, periodoAcademico: string) {
  return {
    codigo_ies: 'ULEAM',
    periodoAcademico,
    facultad: data.facultad || 'Facultad de Educación y Turismo',
    carrera: data.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
    tipoPublicacion: data.tipoPublicacion as any,
    tipoArticulo: data.tipoArticulo,
    codigoPublicacion: data.codigoPublicacion,
    proyecto: data.proyecto,
    titulo: data.titulo,
    tituloLibro: data.tituloLibro,
    nombreRevista: data.nombreRevista,
    issn: data.issn,
    isbn: data.isbn,
    fechaPublicacion,
    campoDetallado: data.campoDetallado,
    estado: data.estado as any,
    linkPublicacion: data.linkPublicacion,
    linkRevista: data.linkRevista,
    filiacion: data.filiacion,
    identificacionParticipante: data.identificacionParticipante,
    categoria: data.categoria as any,
    participacion: data.participacion,
    cuartil: data.cuartil,
    lineaInvestigacion: data.lineaInvestigacion,
    intercultural: data.intercultural,
    baseDatosIndexada: data.baseDatosIndexada,
    revisadoPares: data.revisadoPares,
    tituloCapitulo: data.tituloCapitulo,
    editorCompilador: data.editorCompilador,
    paginas: data.paginas,
    totalCapituloLibro: data.totalCapituloLibro,
    nombrePonencia: data.nombrePonencia,
    nombreEvento: data.nombreEvento,
    edicionEvento: data.edicionEvento,
    organizadorEvento: data.organizadorEvento,
    comiteOrganizador: data.comiteOrganizador,
    pais: data.pais,
    ciudad: data.ciudad,
    certificadoN: data.certificadoN,
    solicitudN: data.solicitudN,
    claseDeObra: data.claseDeObra,
    tituloObra: data.tituloObra,
    lugar: data.lugar,
  };
}

export function autoresParaCrear(authors: DatosContribucion['authors']) {
  return authors.map(autor => ({
    authorName: autor.authorName,
    order: autor.order,
    isCarreraAuthor: autor.isCarreraAuthor,
    esEstudiante: autor.esEstudiante,
  }));
}
