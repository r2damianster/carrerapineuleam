import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const [proyecto] = await sql`
      SELECT * FROM proyectos WHERE slug = ${params.slug} AND tipo = 'plantilla_simple' AND activo = true
    `;
    if (!proyecto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(proyecto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    // Toggle rápido de visibilidad u orden (patrón ya usado en members/fotos)
    if (typeof body.activo === 'boolean' && Object.keys(body).length === 1) {
      const [actualizado] = await sql`
        UPDATE proyectos SET activo = ${body.activo} WHERE slug = ${params.slug} RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(actualizado);
    }
    if (typeof body.order === 'number' && Object.keys(body).length === 1) {
      const [actualizado] = await sql`
        UPDATE proyectos SET "order" = ${body.order} WHERE slug = ${params.slug} RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(actualizado);
    }

    // Edición completa — solo aplica a proyectos plantilla_simple (los
    // 'personalizada' no tienen campos de hero/integración que editar aquí)
    const {
      nombre_oficial, nav_label, grupo_nav, order,
      hero_title1_es, hero_title1_en, hero_title2_es, hero_title2_en,
      hero_subtitle_es, hero_subtitle_en, hero_description_es, hero_description_en,
      integration_text_es, integration_text_en, info_text_es, info_text_en,
      lider_nombre, lider_email, lider_orcid,
    } = body;

    const [actualizado] = await sql`
      UPDATE proyectos SET
        nombre_oficial = COALESCE(${nombre_oficial || null}, nombre_oficial),
        nav_label = COALESCE(${nav_label || null}, nav_label),
        grupo_nav = COALESCE(${grupo_nav || null}, grupo_nav),
        "order" = COALESCE(${order ?? null}, "order"),
        hero_title1_es = ${hero_title1_es ?? null}, hero_title1_en = ${hero_title1_en ?? null},
        hero_title2_es = ${hero_title2_es ?? null}, hero_title2_en = ${hero_title2_en ?? null},
        hero_subtitle_es = ${hero_subtitle_es ?? null}, hero_subtitle_en = ${hero_subtitle_en ?? null},
        hero_description_es = ${hero_description_es ?? null}, hero_description_en = ${hero_description_en ?? null},
        integration_text_es = ${integration_text_es ?? null}, integration_text_en = ${integration_text_en ?? null},
        info_text_es = ${info_text_es ?? null}, info_text_en = ${info_text_en ?? null},
        lider_nombre = ${lider_nombre ?? null}, lider_email = ${lider_email ?? null}, lider_orcid = ${lider_orcid ?? null}
      WHERE slug = ${params.slug}
      RETURNING *
    `;
    if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(actualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
