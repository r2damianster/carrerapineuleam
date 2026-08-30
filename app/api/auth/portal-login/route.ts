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
      SELECT id, nombres, apellidos, email, password_hash, rol, modulos_acceso 
      FROM usuarios 
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const user = users[0];
    
    // Validate password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Create session
    const sessionCookie = await createSessionCookieValue({
      id: user.id.toString(),
      email: user.email,
      nombres: `${user.nombres} ${user.apellidos}`,
      rol: user.rol,
      modulos_acceso: user.modulos_acceso || []
    });

    const response = NextResponse.json({ success: true, redirect: '/portal/dashboard' });
    
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
