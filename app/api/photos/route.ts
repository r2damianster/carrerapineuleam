import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const incluirInactivos = searchParams.get('all') === 'true';
    const ubicacion = searchParams.get('ubicacion');

    // GET público, no llama cookies() en ningún punto -> Next lo trataría
    // como estático y el Data Cache de @neondatabase/serverless cachearía
    // la query para siempre (bug real ya mordido en Sesión 31, ver
    // CLAUDE.md). cache:'no-store' lo desactiva explícitamente.
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    const rows = ubicacion
      ? await sql`
          SELECT * FROM fotos
          WHERE (${incluirInactivos} OR activo = true) AND ${ubicacion} = ANY(ubicaciones)
          ORDER BY "order" ASC
        `
      : await sql`
          SELECT * FROM fotos
          WHERE (${incluirInactivos} OR activo = true)
          ORDER BY "order" ASC
        `;
    return NextResponse.json(rows);
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

    const { url, cloudinary_public_id, titulo, descripcion, ubicaciones, order } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'Falta la URL de la foto' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `foto_${Date.now()}`;
    const [nueva] = await sql`
      INSERT INTO fotos (id, url, cloudinary_public_id, titulo, descripcion, ubicaciones, "order", subido_por)
      VALUES (${id}, ${url}, ${cloudinary_public_id || null}, ${titulo || null}, ${descripcion || null}, ${ubicaciones || []}, ${order ?? 0}, ${usuario.email})
      RETURNING *
    `;
    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
