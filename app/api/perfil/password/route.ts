import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { getAppSessionFromCookies } from '@/lib/session';

export async function PATCH(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { password_actual, password_nueva } = await request.json();
    if (!password_actual || !password_nueva) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }
    if (password_nueva.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [fila] = await sql`SELECT password_hash FROM usuarios WHERE id = ${Number(usuario.id)}`;
    if (!fila) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const esValida = await bcrypt.compare(password_actual, fila.password_hash);
    if (!esValida) {
      return NextResponse.json({ error: 'La contraseña actual no es correcta' }, { status: 401 });
    }

    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await sql`UPDATE usuarios SET password_hash = ${nuevoHash} WHERE id = ${Number(usuario.id)}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
