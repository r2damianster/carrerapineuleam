import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const incluirInactivos = searchParams.get('all') === 'true';

    // GET público sin cookies() -> mismo fix de Data Cache que /api/photos
    // (ver comentario ahí y CLAUDE.md Sesión 31).
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const rows = await sql`
      SELECT * FROM proyectos
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

    const body = await request.json();
    const {
      nombre_oficial, slug, grupo_nav, nav_label, order,
      hero_title1_es, hero_title1_en, hero_title2_es, hero_title2_en,
      hero_subtitle_es, hero_subtitle_en, hero_description_es, hero_description_en,
      integration_text_es, integration_text_en, info_text_es, info_text_en,
      lider_nombre, lider_email, lider_orcid,
    } = body;

    if (!nombre_oficial || !slug || !grupo_nav) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, slug, grupo de navegación)' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    // Solo se permite crear proyectos data-driven desde el admin — los
    // 'personalizada' (páginas con código bespoke) ya existen, no se crean
    // nuevos así.
    const area = grupo_nav === 'vinculacion' ? 'vinculacion' : 'investigacion';
    const [nuevo] = await sql`
      INSERT INTO proyectos (
        id, nombre_oficial, area, tipo, slug, grupo_nav, nav_label, "order",
        hero_title1_es, hero_title1_en, hero_title2_es, hero_title2_en,
        hero_subtitle_es, hero_subtitle_en, hero_description_es, hero_description_en,
        integration_text_es, integration_text_en, info_text_es, info_text_en,
        lider_nombre, lider_email, lider_orcid
      ) VALUES (
        ${slug}, ${nombre_oficial}, ${area}, 'plantilla_simple', ${slug}, ${grupo_nav}, ${nav_label || nombre_oficial}, ${order ?? 0},
        ${hero_title1_es || null}, ${hero_title1_en || null}, ${hero_title2_es || null}, ${hero_title2_en || null},
        ${hero_subtitle_es || null}, ${hero_subtitle_en || null}, ${hero_description_es || null}, ${hero_description_en || null},
        ${integration_text_es || null}, ${integration_text_en || null}, ${info_text_es || null}, ${info_text_en || null},
        ${lider_nombre || null}, ${lider_email || null}, ${lider_orcid || null}
      )
      RETURNING *
    `;
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
