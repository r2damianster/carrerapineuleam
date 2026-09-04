import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET() {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const [fila] = await sql`SELECT channel_title, autorizado_en FROM youtube_canal_auth WHERE id = 1`;

  return NextResponse.json({
    conectado: !!fila,
    channel_title: fila?.channel_title ?? null,
    autorizado_en: fila?.autorizado_en ?? null,
  });
}
