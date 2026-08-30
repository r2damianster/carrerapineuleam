import { NextResponse } from 'next/server';
import { authenticateAdmin, isAdminAuthorized } from '@/lib/db';
import { createAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

export async function POST(request: Request) {
  const body = await request.json();
  const email = (body.email ?? '').trim();
  const password = (body.password ?? '').trim();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
  }

  let admin;
  try {
    admin = await authenticateAdmin(email, password);
  } catch {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  if (!isAdminAuthorized(admin.email)) {
    return NextResponse.json({ error: 'No autorizado. Solo el líder y colíder pueden acceder.' }, { status: 403 });
  }

  const cookieValue = await createAdminSessionCookieValue(admin);
  const response = NextResponse.json({ admin });
  response.cookies.set(ADMIN_SESSION_COOKIE.name, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_COOKIE.maxAge,
  });
  return response;
}
