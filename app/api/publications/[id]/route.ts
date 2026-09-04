import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const [publication] = await sql`SELECT * FROM publications WHERE id = ${params.id}`;
    if (!publication) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(publication);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
      const [actualizada] = await sql`
        UPDATE publications SET activo = ${body.activo}, updated = now()
        WHERE id = ${params.id}
        RETURNING *
      `;
      if (!actualizada) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
      return NextResponse.json(actualizada);
    }

    const { title, authors, abstract, publication_date, doi_link, pdf_file, cover_image, type, category, activo } = body;
    if (!title || !authors || !abstract || !publication_date || !type || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const [actualizada] = await sql`
      UPDATE publications
      SET title = ${title}, authors = ${authors}, abstract = ${abstract}, publication_date = ${publication_date},
          doi_link = ${doi_link || null}, pdf_file = ${pdf_file || null}, cover_image = ${cover_image || null},
          type = ${type}, category = ${category},
          activo = COALESCE(${typeof activo === 'boolean' ? activo : null}, activo), updated = now()
      WHERE id = ${params.id}
      RETURNING *
    `;
    if (!actualizada) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(actualizada);
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
    await sql`DELETE FROM publications WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
