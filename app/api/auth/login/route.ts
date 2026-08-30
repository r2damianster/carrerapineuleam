import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { createUserSessionCookieValue, USER_SESSION_COOKIE, UsuarioSession } from '@/lib/userSession';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const [user] = await sql`
    SELECT id, nombres, apellidos, email, rol, password_hash
    FROM usuarios WHERE email = ${String(email).trim().toLowerCase()}
  `;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const session: UsuarioSession = {
    id: user.id,
    nombres: user.nombres,
    apellidos: user.apellidos,
    email: user.email,
    rol: user.rol,
  };

  const cookieValue = createUserSessionCookieValue(session);
  const response = NextResponse.json({ usuario: session });
  response.cookies.set(USER_SESSION_COOKIE.name, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: USER_SESSION_COOKIE.maxAge,
  });
  return response;
}
