import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppSessionFromCookies } from '@/lib/session';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';
import { puedeEditarContribucion, puedeEliminarContribucion, puedeAprobarContribucion } from '@/lib/permisosContribucion';
import { contribucionSchema as baseSchema } from '@/lib/contribucionSchema';
import { datosContribucion, autoresParaCrear } from '@/lib/contribucionData';

export async function GET() {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const contributions = await prisma.contribution.findMany({
    include: { authors: true },
    orderBy: { fechaSubida: 'desc' },
  });
  // Flags calculados en el servidor — el frontend nunca decide permisos por su cuenta.
  const conPermisos = contributions.map(c => ({
    ...c,
    _puedeEditar: puedeEditarContribucion(usuario, c),
    _puedeEliminar: puedeEliminarContribucion(usuario),
    _puedeAprobar: puedeAprobarContribucion(usuario, c),
  }));
  return NextResponse.json(conPermisos);
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
  const fechaPub = new Date(data.fechaPublicacion);
  const periodoAcademico = calcularPeriodoAcademico(fechaPub);
  const contribution = await prisma.contribution.create({
    data: {
      ...datosContribucion(data, fechaPub, periodoAcademico),
      creadoPorId: Number(usuario.id),
      authors: { create: autoresParaCrear(data.authors) },
    },
    include: { authors: true },
  });
  return NextResponse.json(contribution, { status: 201 });
}

export async function DELETE(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !puedeEliminarContribucion(usuario)) {
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
