import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') === 'true';
    const categories = onlyActive
      ? await sql`SELECT * FROM video_categories WHERE is_active = true ORDER BY "order" ASC`
      : await sql`SELECT * FROM video_categories ORDER BY "order" ASC`;
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { name, slug, description, order, is_active } = await request.json();
    if (!name || !slug) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `cat_${Date.now()}`;
    const [nueva] = await sql`
      INSERT INTO video_categories (id, name, slug, description, "order", is_active)
      VALUES (${id}, ${name}, ${slug}, ${description || null}, ${order ?? 0}, ${is_active ?? true})
      RETURNING *
    `;
    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('video_categories_slug_key')) {
      return NextResponse.json({ error: 'Ese slug ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
