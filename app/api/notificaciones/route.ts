import { NextResponse } from 'next/server';
import { getAppSessionFromCookies } from '@/lib/session';
import { obtenerNotificaciones } from '@/lib/notificaciones';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const notificaciones = await obtenerNotificaciones(sesion);
    return NextResponse.json({ success: true, data: notificaciones });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
