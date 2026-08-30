import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { createSessionCookieValue, SESSION_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  const body = await request.json();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
  }

  const [estudiante] = await sql`
    SELECT id, nombre, email, modalidad
    FROM estudiantes
    WHERE email = ${email} AND password_hash IS NOT NULL AND password_hash = crypt(${password}, password_hash)
  `;

  if (!estudiante) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const cookieValue = createSessionCookieValue({
    id: estudiante.id,
    nombre: estudiante.nombre,
    email: estudiante.email,
    modalidad: estudiante.modalidad,
  });

  const response = NextResponse.json({ estudiante });
  response.cookies.set(SESSION_COOKIE.name, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE.maxAge,
  });
  return response;
}
