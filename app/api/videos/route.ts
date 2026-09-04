import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

function extractEmbedId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&\?]{10,12})/);
  return match?.[1] || null;
}

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';
    // ?all=true (usado solo por /admin/videos) trae también los ocultos
    // (activo=false) para poder reactivarlos — el sitio público nunca lo manda.
    const incluirInactivos = searchParams.get('all') === 'true';

    let rows;
    if (categoryId) {
      rows = await sql`
        SELECT v.*, row_to_json(c.*) AS category_expand
        FROM videos v LEFT JOIN video_categories c ON c.id = v.category
        WHERE v.category = ${categoryId} AND (${incluirInactivos} OR v.activo = true)
        ORDER BY v."order" ASC
      `;
    } else if (featuredOnly) {
      rows = await sql`
        SELECT v.*, row_to_json(c.*) AS category_expand
        FROM videos v LEFT JOIN video_categories c ON c.id = v.category
        WHERE v.is_featured = true AND (${incluirInactivos} OR v.activo = true)
        ORDER BY v."order" ASC LIMIT 6
      `;
    } else {
      rows = await sql`
        SELECT v.*, row_to_json(c.*) AS category_expand
        FROM videos v LEFT JOIN video_categories c ON c.id = v.category
        WHERE (${incluirInactivos} OR v.activo = true)
        ORDER BY v."order" ASC
      `;
    }

    const videos = rows.map((r: any) => {
      const { category_expand, ...video } = r;
      return { ...video, expand: { category: category_expand } };
    });
    return NextResponse.json(videos);
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

    const { title, youtube_url, description, category, published_date, order, is_featured, tags } = await request.json();
    if (!title || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    // El link ya no es obligatorio — se puede registrar solo con metadata y
    // completar el link después, editando (pedido del usuario, Sesión 24).
    const embed_id = youtube_url ? extractEmbedId(youtube_url) : null;

    const sql = neon(process.env.DATABASE_URL!);
    const id = `video_${Date.now()}`;
    const [nuevo] = await sql`
      INSERT INTO videos (id, title, youtube_url, embed_id, description, category, published_date, "order", is_featured, tags)
      VALUES (${id}, ${title}, ${youtube_url || null}, ${embed_id}, ${description || null}, ${category}, ${published_date || null}, ${order ?? 0}, ${!!is_featured}, ${tags || null})
      RETURNING *
    `;
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
