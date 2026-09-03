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
const GENEROS_VALIDOS = ['femenino', 'masculino', 'otro', 'prefiero_no_decir'];

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nombres, apellidos, password, rol, genero, fecha_nacimiento } = data;
    const email = String(data.email ?? '').trim().toLowerCase();
    const cedula = String(data.cedula ?? '').trim();
    const orcid = data.orcid ? String(data.orcid).trim() : null;

    if (!nombres || !apellidos || !email || !password || !rol || !cedula || !genero || !fecha_nacimiento) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(cedula)) {
      return NextResponse.json({ error: 'La cédula debe tener 10 dígitos' }, { status: 400 });
    }

    if (!GENEROS_VALIDOS.includes(genero)) {
      return NextResponse.json({ error: 'Género no válido' }, { status: 400 });
    }

    if (orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid)) {
      return NextResponse.json({ error: 'ORCID inválido (formato 0000-0000-0000-0000)' }, { status: 400 });
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

    const existingCedula = await sql`SELECT id FROM usuarios WHERE cedula = ${cedula}`;
    if (existingCedula.length > 0) {
      return NextResponse.json({ error: 'La cédula ya está registrada' }, { status: 400 });
    }

    // Hashear password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const modulosAcceso = rol === 'profesor' ? (profesorModulos[email] ?? []) : [];

    // Insertar usuario (solo campos de auth/identidad interna — cédula es
    // privada, nunca se expone en `members`. orcid/genero/fecha_nacimiento
    // son datos públicos del perfil, van a `members`, no a `usuarios`)
    const userResult = await sql`
      INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, cedula)
      VALUES (${nombres}, ${apellidos}, ${email}, ${password_hash}, ${rol}, ${modulosAcceso}, ${cedula})
      RETURNING id
    `;

    const userId = userResult[0].id;

    // Si ya existe una tarjeta pública (members) para este email —cargada a
    // mano por contenido_sitio—, se completan orcid/genero/fecha_nacimiento
    // ahí. No se crea una fila de members nueva: esa tabla sigue curada por
    // admin (foto, rol descriptivo, proyecto), un profesor no debe generar
    // su propia tarjeta pública solo por registrarse.
    await sql`
      UPDATE members
      SET orcid = COALESCE(${orcid}, orcid),
          genero = ${genero},
          fecha_nacimiento = ${fecha_nacimiento}
      WHERE email = ${email}
    `;

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
