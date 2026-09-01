import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { createSessionCookieValue, SESSION_COOKIE, AppSession } from '@/lib/session';
import { profesoresAutorizados, profesorModulos } from '@/lib/data';

// 'estudiante' no es autoregistro — se maneja desde Administrar Pasantes
// (el profesor pre-crea el email, el pasante activa su cuenta al hacer login
// la primera vez). Ver app/api/estudiantes/route.ts.
// 'beneficiario' tampoco — nunca tiene cuenta, lo crea el instructor/profesor
// desde /vinculacion/beneficiarios (POST /api/beneficiarios).
const PUBLIC_ROLES = ['profesor'];

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nombres, apellidos, password, rol } = data;
    const email = String(data.email ?? '').trim().toLowerCase();

    if (!nombres || !apellidos || !email || !password || !rol) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!PUBLIC_ROLES.includes(rol)) {
      return NextResponse.json({ error: 'Rol no válido' }, { status: 400 });
    }

    if (rol === 'profesor' && !profesoresAutorizados.includes(email)) {
      return NextResponse.json(
        { error: 'Este correo no está autorizado para registrarse como profesor. Contacta al administrador del proyecto.' },
        { status: 403 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Verificar si el email ya existe
    const existingUser = await sql`SELECT id FROM usuarios WHERE email = ${email}`;
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    // Hashear password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const modulosAcceso = rol === 'profesor' ? (profesorModulos[email] ?? []) : [];

    // Insertar usuario
    const userResult = await sql`
      INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso)
      VALUES (${nombres}, ${apellidos}, ${email}, ${password_hash}, ${rol}, ${modulosAcceso})
      RETURNING id
    `;

    const userId = userResult[0].id;

    const session: AppSession = { id: String(userId), nombres: `${nombres} ${apellidos}`, email, rol, modulos_acceso: modulosAcceso };
    const cookieValue = await createSessionCookieValue(session);
    const response = NextResponse.json({ success: true, message: 'Usuario registrado exitosamente', usuario: session });
    response.cookies.set(SESSION_COOKIE.name, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE.maxAge,
    });
    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error registrando el usuario', details: error.message },
      { status: 500 }
    );
  }
}
