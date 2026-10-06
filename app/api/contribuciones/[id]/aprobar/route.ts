import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeAprobarContribucion } from '@/lib/permisosContribucion';

// Aprobar o rechazar un envío externo (por enlace/QR) pendiente. Lo hace el docente que generó
// el enlace (creadoPorId) o admin/superadmin. Rechazar borra la fila — solo si sigue pendiente y
// vino de un enlace; el resto de contribuciones solo las borra admin (DELETE /api/contribuciones).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { accion } = await request.json().catch(() => ({ accion: null }));
  if (accion !== 'aprobar' && accion !== 'rechazar') {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  const contribucion = await prisma.contribution.findUnique({ where: { id: params.id } });
  if (!contribucion) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }
  if (contribucion.origen !== 'enlace_externo' || !puedeAprobarContribucion(usuario, contribucion)) {
    return NextResponse.json({ error: 'No autorizado para esta contribución' }, { status: 403 });
  }

  if (accion === 'rechazar') {
    await prisma.contribution.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, eliminada: true });
  }

  await prisma.contribution.update({
    where: { id: params.id },
    data: { aprobada: true, validadoPor: String(usuario.id), fechaValidacion: new Date() },
  });
  return NextResponse.json({ success: true });
}
