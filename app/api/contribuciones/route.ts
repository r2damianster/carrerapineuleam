import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getAppSessionFromCookies } from '@/lib/session';

// Esquema de validación usando Zod – los campos dependen del tipo de publicación
const baseSchema = z.object({
  codigo_ies: z.string().optional(), // será fijado a 'ULEAM'
  facultad: z.string().optional(),
  carrera: z.string().optional(),
  tipoPublicacion: z.enum([
    'ARTICULO_REGIONAL',
    'ARTICULO_ALTO_IMPACTO',
    'LIBRO',
    'CAPITULO_LIBRO',
    'MEMORIA_EVENTO',
    'PROPIEDAD_INTELECTUAL',
  ]),
  tipoArticulo: z.string().optional(),
  codigoPublicacion: z.string().optional(),
  proyecto: z.string().optional(),
  titulo: z.string(),
  tituloLibro: z.string().optional(),
  nombreRevista: z.string().optional(),
  issn: z.string().optional(),
  isbn: z.string().optional(),
  fechaPublicacion: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  campoDetallado: z.string(),
  estado: z.enum(['PUBLICADO', 'ACEPTADO', 'OTRO']),
  linkPublicacion: z.string().optional(),
  linkRevista: z.string().optional(),
  filiacion: z.string().optional(),
  identificacionParticipante: z.string().optional(),
  categoria: z.enum([
    'AUXILIAR_I',
    'AUXILIAR_II',
    'AGREGADO_I',
    'AGREGADO_II',
    'PRINCIPAL_I',
    'PRINCIPAL_II',
  ]).optional(),
  participacion: z.string().optional(),
  cuartil: z.string().optional(),
  lineaInvestigacion: z.string(),
  intercultural: z.string().optional(),
  authors: z.array(
    z.object({
      authorName: z.string(),
      order: z.number().int().min(1).max(5),
      isCarreraAuthor: z.boolean(),
    })
  ),
});

export async function GET() {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !usuario.modulos_acceso.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const contributions = await prisma.contribution.findMany({
    include: { authors: true },
    orderBy: { fechaSubida: 'desc' },
  });
  return NextResponse.json(contributions);
}

export async function POST(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const body = await request.json();
  const parseResult = baseSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors }, { status: 400 });
  }
  const data = parseResult.data;
  // Forzar CODIGO_IES a ULEAM y defaults de facultad/carrera
  data.codigo_ies = 'ULEAM';
  if (!data.facultad) data.facultad = 'Facultad de Educación y Turismo';
  if (!data.carrera) data.carrera = 'Pedagogía de los Idiomas Nacionales y Extranjeros';
  const fechaPub = new Date(data.fechaPublicacion);
  const contribution = await prisma.contribution.create({
    data: {
      codigo_ies: data.codigo_ies,
      facultad: data.facultad,
      carrera: data.carrera,
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
      authors: {
        create: data.authors.map(a => ({
          authorName: a.authorName,
          order: a.order,
          isCarreraAuthor: a.isCarreraAuthor,
        })),
      },
    },
    include: { authors: true },
  });
  return NextResponse.json(contribution, { status: 201 });
}

export async function DELETE(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !usuario.modulos_acceso.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  try {
    await prisma.contribution.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
