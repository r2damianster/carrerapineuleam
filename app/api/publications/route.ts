import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const publications = await sql`SELECT * FROM publications ORDER BY publication_date DESC`;
    return NextResponse.json(publications);
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
