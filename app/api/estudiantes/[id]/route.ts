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

    const body = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    // Toggle rápido del permiso de subir video (mismo patrón que el toggle de
    // "activo" en members/videos) — no exige los campos del formulario completo.
    if (typeof body.puede_subir_video === 'boolean' && Object.keys(body).length === 1) {
      const modulosAcceso = body.puede_subir_video ? ['subir_video'] : [];
      const [actualizado] = await sql`
        UPDATE usuarios SET modulos_acceso = ${modulosAcceso}
        WHERE id = ${parseInt(params.id)} AND rol = 'estudiante'
        RETURNING id, nombres, apellidos, email, activado, modulos_acceso
      `;
      if (!actualizado) return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 });
      return NextResponse.json({ success: true, data: actualizado });
    }

    const { nombres, apellidos, email } = body;
    if (!nombres || !apellidos || !email) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const [actualizado] = await sql`
      UPDATE usuarios
      SET nombres = ${nombres}, apellidos = ${apellidos}, email = ${String(email).trim().toLowerCase()}
      WHERE id = ${parseInt(params.id)} AND rol = 'estudiante'
      RETURNING id, nombres, apellidos, email, activado, modulos_acceso
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
