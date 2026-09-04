import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

function extractEmbedId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&\?]{10,12})/);
  return match?.[1] || null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    // Toggle rápido de visibilidad desde la tabla del admin (ocultar sin
    // borrar) — no exige los campos obligatorios del formulario completo.
    if (typeof body.activo === 'boolean' && Object.keys(body).length === 1) {
      const [actualizado] = await sql`
        UPDATE videos SET activo = ${body.activo}, updated = now()
        WHERE id = ${params.id}
        RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(actualizado);
    }

    const { title, youtube_url, description, category, published_date, order, is_featured, tags, activo } = body;
    if (!title || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    const embed_id = youtube_url ? extractEmbedId(youtube_url) : null;

    const [actualizado] = await sql`
      UPDATE videos
      SET title = ${title}, youtube_url = ${youtube_url || null}, embed_id = ${embed_id},
          description = ${description || null}, category = ${category},
          published_date = ${published_date || null}, "order" = ${order ?? 0},
          is_featured = ${!!is_featured}, tags = ${tags || null},
          activo = COALESCE(${typeof activo === 'boolean' ? activo : null}, activo), updated = now()
      WHERE id = ${params.id}
      RETURNING *
    `;
    if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(actualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    await sql`DELETE FROM videos WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
