import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol) || !usuario.modulos_acceso.includes('vinculacion')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombres, apellidos, email } = await request.json();
    if (!nombres || !apellidos || !email) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [actualizado] = await sql`
      UPDATE usuarios
      SET nombres = ${nombres}, apellidos = ${apellidos}, email = ${String(email).trim().toLowerCase()}
      WHERE id = ${parseInt(params.id)} AND rol = 'estudiante'
      RETURNING id, nombres, apellidos, email, activado
    `;

    if (!actualizado) {
      return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: actualizado });
  } catch (error: any) {
    if (error.message?.includes('usuarios_email_key')) {
      return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol) || !usuario.modulos_acceso.includes('vinculacion')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    await sql`DELETE FROM usuarios WHERE id = ${parseInt(params.id)} AND rol = 'estudiante'`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
