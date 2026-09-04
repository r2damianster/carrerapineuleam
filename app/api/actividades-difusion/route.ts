import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

// Fusión de News + Activities (sitio estático) + Difusión interna
// (/vinculacion/difusion, /gestion-carrera) — ver CLAUDE.md Sesión 25.
// GET público: solo aprobado_sitio=true (contenido ya revisado por
// contenido_sitio). GET ?pendientes=true: cola de moderación, protegido.
//
// `seccion` filtra por dónde se PUBLICA la fila (publicar_noticias /
// publicar_actividades) — independiente de `origen`, que solo registra cómo
// se creó. Antes NewsSection/ActivityGallery filtraban por `origen`
// directamente, lo que forzaba que un evento fuera SOLO noticia O SOLO
// actividad (nunca ambas) y dejaba invisibles para siempre las difusiones
// aprobadas (origen='difusion' no lo leía ninguna sección pública). `origen`
// se mantiene por compatibilidad con quien todavía lo use (ej. getNewsletters).

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origen = searchParams.get('origen'); // 'noticia' | 'actividad' | 'difusion'
    const seccion = searchParams.get('seccion'); // 'noticias' | 'actividades'
    const pendientes = searchParams.get('pendientes') === 'true';
    // ?all=true (usado solo por /admin/news y /admin/activities) trae también
    // las filas con publicar_noticias/publicar_actividades=false (ocultas sin
    // borrar) para que el admin las siga viendo y pueda reactivarlas — el
    // sitio público nunca lo manda.
    const incluirOcultas = searchParams.get('all') === 'true';
    const sql = neon(process.env.DATABASE_URL!);

    if (pendientes) {
      const usuario = await getAppSessionFromCookies();
      if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const rows = await sql`
        SELECT * FROM actividades_difusion WHERE aprobado_sitio = false ORDER BY fecha DESC NULLS LAST
      `;
      return NextResponse.json(rows);
    }

    if (seccion === 'noticias') {
      const rows = await sql`
        SELECT * FROM actividades_difusion
        WHERE aprobado_sitio = true AND (${incluirOcultas} OR publicar_noticias = true)
        ORDER BY "order" ASC, fecha DESC NULLS LAST
      `;
      return NextResponse.json(rows);
    }
    if (seccion === 'actividades') {
      const rows = await sql`
        SELECT * FROM actividades_difusion
        WHERE aprobado_sitio = true AND (${incluirOcultas} OR publicar_actividades = true)
        ORDER BY "order" ASC, fecha DESC NULLS LAST
      `;
      return NextResponse.json(rows);
    }

    const rows = origen
      ? await sql`
          SELECT * FROM actividades_difusion
          WHERE aprobado_sitio = true AND origen = ${origen}
          ORDER BY "order" ASC, fecha DESC NULLS LAST
        `
      : await sql`
          SELECT * FROM actividades_difusion
          WHERE aprobado_sitio = true
          ORDER BY "order" ASC, fecha DESC NULLS LAST
        `;
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Crear directo desde /admin (contenido_sitio) — nace ya aprobado, distinto
// del registro interno de docentes/estudiantes vía POST /api/difusion (que
// nace con aprobado_sitio=false, pendiente de revisión).
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { origen, titulo, descripcion, fecha, categoria, photos, slug, external_link, project_id, is_featured, order, publicar_noticias, publicar_actividades } = await request.json();
    if (!titulo || !fecha || !origen) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [nueva] = await sql`
      INSERT INTO actividades_difusion
        (origen, titulo, descripcion, fecha, categoria, photos, slug, external_link, project_id, is_featured, "order", aprobado_sitio, aprobado_por, fecha_aprobacion, profesores_responsables, publicar_noticias, publicar_actividades)
      VALUES
        (${origen}, ${titulo}, ${descripcion || null}, ${fecha}, ${categoria || null}, ${photos || []}, ${slug || null}, ${external_link || null}, ${project_id || null}, ${!!is_featured}, ${order ?? 0}, true, ${Number(usuario.id)}, now(), '{}', ${!!publicar_noticias}, ${!!publicar_actividades})
      RETURNING *
    `;
    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('actividades_difusion_slug_key')) {
      return NextResponse.json({ error: 'Ese slug ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
