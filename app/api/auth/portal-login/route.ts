import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { createSessionCookieValue, SESSION_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Find user
    const users = await sql`
      SELECT id, nombres, apellidos, email, password_hash, rol, modulos_acceso, activado
      FROM usuarios
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const user = users[0];

    if (!user.activado) {
      // Primer ingreso: el pasante fue pre-registrado por su profesor (solo
      // nombres/apellidos/email, sin password). Lo que escribe aquí se guarda
      // como su clave definitiva.
      if (password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      const nuevoHash = await bcrypt.hash(password, 10);
      await sql`UPDATE usuarios SET password_hash = ${nuevoHash}, activado = true WHERE id = ${user.id}`;
    } else {
      // Validate password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
    }

    // Create session
    const sessionCookie = await createSessionCookieValue({
      id: user.id.toString(),
      email: user.email,
      nombres: `${user.nombres} ${user.apellidos}`,
      rol: user.rol,
      modulos_acceso: user.modulos_acceso || []
    });

    const url = new URL(request.url);
    const redirectParam = url.searchParams.get('redirect');
    const redirect = redirectParam ? decodeURIComponent(redirectParam) : '/portal/dashboard';

    const response = NextResponse.json({ success: true, redirect });
    
    response.cookies.set({
      name: SESSION_COOKIE.name,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_COOKIE.maxAge,
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
