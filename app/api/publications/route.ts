import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : null;
    const page = searchParams.get('page') ? Math.max(1, parseInt(searchParams.get('page')!, 10)) : 1;
    const category = searchParams.get('category');
    const query = searchParams.get('q');
    const offset = limit ? (page - 1) * limit : 0;
    const searchPattern = query ? `%${query}%` : null;
    // ?all=true (usado solo por /admin/publications) trae también las ocultas
    // (activo=false) para poder reactivarlas — el sitio público nunca lo manda.
    const incluirInactivas = searchParams.get('all') === 'true';

    const publications = await sql`
      SELECT * FROM publications
      WHERE (${category}::text IS NULL OR category = ${category})
        AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR authors ILIKE ${searchPattern})
        AND (${incluirInactivas} OR activo = true)
      ORDER BY publication_date DESC
      ${limit ? sql`LIMIT ${limit} OFFSET ${offset}` : sql``}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM publications
      WHERE (${category}::text IS NULL OR category = ${category})
        AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR authors ILIKE ${searchPattern})
        AND (${incluirInactivas} OR activo = true)
    `;

    if (!limit) {
      return NextResponse.json(publications);
    }
    return NextResponse.json({ publications, total: count });
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

    const { title, authors, abstract, publication_date, doi_link, pdf_file, cover_image, type, category } = await request.json();
    if (!title || !authors || !abstract || !publication_date || !type || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `pub_${Date.now()}`;
    const [nueva] = await sql`
      INSERT INTO publications (id, title, authors, abstract, publication_date, doi_link, pdf_file, cover_image, type, category)
      VALUES (${id}, ${title}, ${authors}, ${abstract}, ${publication_date}, ${doi_link || null}, ${pdf_file || null}, ${cover_image || null}, ${type}, ${category})
      RETURNING *
    `;
    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
