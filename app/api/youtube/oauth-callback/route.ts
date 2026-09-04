import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { getOAuthClient, obtenerInfoCanal } from '@/lib/youtube';

export async function GET(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/admin/videos?youtube_error=sin_codigo', request.url));
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      // Pasa si la cuenta ya había autorizado antes y Google no reemite el
      // refresh_token pese a prompt=consent (caso raro) — pedir que revoque el
      // acceso desde https://myaccount.google.com/permissions y reintente.
      return NextResponse.redirect(new URL('/admin/videos?youtube_error=sin_refresh_token', request.url));
    }

    const info = await obtenerInfoCanal(tokens.access_token!);

    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO youtube_canal_auth (id, refresh_token, channel_id, channel_title, autorizado_por, autorizado_en)
      VALUES (1, ${tokens.refresh_token}, ${info?.id ?? null}, ${info?.title ?? null}, ${Number(usuario.id)}, now())
      ON CONFLICT (id) DO UPDATE SET
        refresh_token = EXCLUDED.refresh_token,
        channel_id = EXCLUDED.channel_id,
        channel_title = EXCLUDED.channel_title,
        autorizado_por = EXCLUDED.autorizado_por,
        autorizado_en = now()
    `;

    return NextResponse.redirect(new URL('/admin/videos?conectado=true', request.url));
  } catch (error: any) {
    console.error('YouTube oauth-callback error:', error);
    return NextResponse.redirect(new URL('/admin/videos?youtube_error=fallo_intercambio', request.url));
  }
}
