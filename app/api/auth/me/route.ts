import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const usuario = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE.name)?.value);
  if (!usuario) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({ usuario });
}
