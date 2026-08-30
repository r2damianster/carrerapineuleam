import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionCookieValue(cookieStore.get(SESSION_COOKIE.name)?.value);

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  return NextResponse.json({ estudiante: session });
}
