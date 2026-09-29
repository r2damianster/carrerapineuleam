import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppSessionFromCookies } from '@/lib/session';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';
import { puedeEditarContribucion, puedeEliminarContribucion } from '@/lib/permisosContribucion';
import { contribucionSchema as baseSchema } from '@/lib/contribucionSchema';

// GET: detalle de una contribución (para precargar el formulario de edición).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const contribution = await prisma.contribution.findUnique({
    where: { id: params.id },
    include: { authors: true },
  });
  if (!contribution) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }
  if (!puedeEditarContribucion(usuario, contribution)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json({
    ...contribution,
    _puedeEditar: true,
    _puedeEliminar: puedeEliminarContribucion(usuario),
  });
}

// PATCH: solo el autor/coautor de carrera, quien la registró, o admin/superadmin.
// Nunca permite tocar creadoPorId (se ignora si viene en el body).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const existente = await prisma.contribution.findUnique({
    where: { id: params.id },
    include: { authors: true },
  });
  if (!existente) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }
  if (!puedeEditarContribucion(usuario, existente)) {
    return NextResponse.json({ error: 'No autorizado para editar esta contribución' }, { status: 403 });
  }

  const body = await request.json();
  const parseResult = baseSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors }, { status: 400 });
  }
  const data = parseResult.data;
  const fechaPub = new Date(data.fechaPublicacion);
  const periodoAcademico = calcularPeriodoAcademico(fechaPub);

  const actualizada = await prisma.contribution.update({
    where: { id: params.id },
    data: {
      periodoAcademico,
      facultad: data.facultad || existente.facultad,
      carrera: data.carrera || existente.carrera,
      tipoPublicacion: data.tipoPublicacion as any,
      tipoArticulo: data.tipoArticulo,
      codigoPublicacion: data.codigoPublicacion,
      proyecto: data.proyecto,
      titulo: data.titulo,
      tituloLibro: data.tituloLibro,
      nombreRevista: data.nombreRevista,
      issn: data.issn,
      isbn: data.isbn,
      fechaPublicacion: fechaPub,
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
      // creadoPorId nunca se toca acá — la propiedad no cambia por editar.
      authors: {
        deleteMany: {},
        create: data.authors.map(a => ({
          authorName: a.authorName,
          order: a.order,
          isCarreraAuthor: a.isCarreraAuthor,
          esEstudiante: a.esEstudiante,
        })),
      },
    },
    include: { authors: true },
  });
  return NextResponse.json(actualizada);
}
