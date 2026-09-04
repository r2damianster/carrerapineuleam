import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { obtenerAccessToken, iniciarSesionReanudable } from '@/lib/youtube';

// Profesor/admin siempre puede proponer un video. Un estudiante-instructor
// solo si el profesor le activó el permiso desde Administrar Pasantes
// (usuarios.modulos_acceso incluye 'subir_video'). La aprobación ocurre
// después en /admin/videos, no aquí.
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    const autorizado = usuario && (
      ['profesor', 'admin'].includes(usuario.rol) ||
      (usuario.rol === 'estudiante' && usuario.modulos_acceso.includes('subir_video'))
    );
    if (!autorizado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { title, description, fileSize, mimeType } = await request.json();
    if (!title || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!mimeType.startsWith('video/')) {
      return NextResponse.json({ error: 'El archivo debe ser un video' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    let accessToken: string;
    try {
      accessToken = await obtenerAccessToken(sql);
    } catch {
      return NextResponse.json({ error: 'No hay ningún canal de YouTube conectado. Pide a un administrador que lo conecte desde /admin/videos.' }, { status: 409 });
    }

    const uploadUrl = await iniciarSesionReanudable({
      accessToken,
      title,
      description: description || '',
      privacyStatus: 'unlisted',
      fileSize,
      mimeType,
    });

    return NextResponse.json({ uploadUrl });
  } catch (error: any) {
    console.error('iniciar-subida error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
