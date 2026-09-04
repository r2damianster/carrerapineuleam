import { NextResponse } from 'next/server';
import { getAppSessionFromCookies } from '@/lib/session';
import { getOAuthClient, YOUTUBE_UPLOAD_SCOPE } from '@/lib/youtube';

export async function GET() {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // fuerza a devolver refresh_token incluso si ya se autorizó antes
    scope: [YOUTUBE_UPLOAD_SCOPE],
  });
  return NextResponse.redirect(url);
}
