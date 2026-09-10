import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { obtenerAccessToken, iniciarSesionReanudable } from '@/lib/youtube';

// Profesor/admin siempre puede proponer un video. Un estudiante-instructor
// solo si el profesor le activó el permiso desde Administrar Pasantes
// (usuarios.modulos_acceso incluye 'subir_video'). La aprobación ocurre
// después en /admin/videos, no aquí.
//
// Tercera vía (Sesión 37): quien tiene un enlace_token de enlaces_difusion
// vigente (ver /api/enlaces-difusion) también puede iniciar la subida — el
// canal de YouTube es institucional (un solo refresh_token compartido en
// youtube_canal_auth, ver lib/youtube.ts), no ligado a la sesión de quien
// sube, así que no hay diferencia técnica entre "estudiante autorizado" y
// "externo con enlace vigente". El video igual queda pendiente de
// aprobación en /admin/videos antes de ser público.
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    const { title, description, fileSize, mimeType, enlace_token } = await request.json();

    let autorizado = !!usuario && (
      ['profesor', 'admin'].includes(usuario.rol) ||
      (usuario.rol === 'estudiante' && usuario.modulos_acceso.includes('subir_video'))
    );

    const sql = neon(process.env.DATABASE_URL!);

    if (!autorizado && enlace_token) {
      const [enlace] = await sql`
        SELECT tipo_contenido, expira_en, max_usos, usos_actuales, activo FROM enlaces_difusion WHERE token = ${enlace_token}
      `;
      if (enlace) {
        const expirado = new Date(enlace.expira_en).getTime() <= Date.now();
        const agotado = enlace.max_usos !== null && enlace.usos_actuales >= enlace.max_usos;
        // Solo enlaces generados para "podcast" habilitan subir video — uno
        // de "evento" (foto) no debe poder subir a YouTube aunque esté vigente.
        autorizado = enlace.tipo_contenido === 'podcast' && enlace.activo && !expirado && !agotado;
      }
    }

    if (!autorizado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!title || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!mimeType.startsWith('video/')) {
      return NextResponse.json({ error: 'El archivo debe ser un video' }, { status: 400 });
    }

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
