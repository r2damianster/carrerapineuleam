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

    // Toggle rápido de un permiso puntual (mismo patrón que el toggle de
    // "activo" en members/videos) — no exige los campos del formulario
    // completo. Se agrega/quita solo el flag pedido, sin pisar el resto de
    // modulos_acceso que el pasante ya tuviera (ej. no perder "subir_video"
    // al togglear "investigacion" o viceversa).
    const flagsTogglables: Record<string, string> = {
      puede_subir_video: 'subir_video',
      tiene_investigacion: 'investigacion',
    };
    const flagPedido = Object.keys(flagsTogglables).find(
      campo => typeof body[campo] === 'boolean' && Object.keys(body).length === 1
    );
    if (flagPedido) {
      const modulo = flagsTogglables[flagPedido];
      const actual = await sql`
        SELECT modulos_acceso FROM usuarios WHERE id = ${parseInt(params.id)} AND rol = 'estudiante'
      `;
      if (actual.length === 0) return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 });

      const modulosActuales: string[] = actual[0].modulos_acceso || [];
      const activar = body[flagPedido] as boolean;
      const modulosAcceso = activar
        ? Array.from(new Set([...modulosActuales, modulo]))
        : modulosActuales.filter(m => m !== modulo);

      const [actualizado] = await sql`
        UPDATE usuarios SET modulos_acceso = ${modulosAcceso}
        WHERE id = ${parseInt(params.id)} AND rol = 'estudiante'
        RETURNING id, nombres, apellidos, email, activado, modulos_acceso
      `;
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
