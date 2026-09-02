import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

// PATCH cubre dos usos, según qué venga en el body:
// - aprobar/enriquecer un registro de difusión pendiente (fotos, is_featured, slug, categoria)
// - editar un registro creado directo desde /admin (noticia/actividad)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const titulo = body.titulo ?? null;
    const descripcion = body.descripcion ?? null;
    const fecha = body.fecha ?? null;
    const categoria = body.categoria ?? null;
    const photos = body.photos ?? null;
    const slug = body.slug ?? null;
    const external_link = body.external_link ?? null;
    const project_id = body.project_id ?? null;
    const is_featured = typeof body.is_featured === 'boolean' ? body.is_featured : null;
    const order = typeof body.order === 'number' ? body.order : null;
    const aprobar = !!body.aprobar;
    // Al aprobar una difusión pendiente (origen='difusion'), por defecto se
    // publica como actividad — si no se manda publicar_actividades explícito,
    // aprobar=true implica publicar_actividades=true (si no, la fila quedaba
    // aprobada pero invisible en ambas secciones, el bug que motivó este flag).
    const publicarNoticias = typeof body.publicar_noticias === 'boolean' ? body.publicar_noticias : null;
    const publicarActividades = typeof body.publicar_actividades === 'boolean'
      ? body.publicar_actividades
      : (aprobar ? true : null);

    const sql = neon(process.env.DATABASE_URL!);
    const [actualizado] = await sql`
      UPDATE actividades_difusion
      SET titulo = COALESCE(${titulo}, titulo),
          descripcion = COALESCE(${descripcion}, descripcion),
          fecha = COALESCE(${fecha}, fecha),
          categoria = COALESCE(${categoria}, categoria),
          photos = COALESCE(${photos}, photos),
          slug = COALESCE(${slug}, slug),
          external_link = COALESCE(${external_link}, external_link),
          project_id = COALESCE(${project_id}, project_id),
          is_featured = COALESCE(${is_featured}, is_featured),
          "order" = COALESCE(${order}, "order"),
          publicar_noticias = COALESCE(${publicarNoticias}, publicar_noticias),
          publicar_actividades = COALESCE(${publicarActividades}, publicar_actividades),
          aprobado_sitio = CASE WHEN ${!!aprobar} THEN true ELSE aprobado_sitio END,
          aprobado_por = CASE WHEN ${!!aprobar} THEN ${Number(usuario.id)} ELSE aprobado_por END,
          fecha_aprobacion = CASE WHEN ${!!aprobar} THEN now() ELSE fecha_aprobacion END
      WHERE id = ${parseInt(params.id)}
      RETURNING *
    `;
    if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(actualizado);
  } catch (error: any) {
    if (error.message?.includes('actividades_difusion_slug_key')) {
      return NextResponse.json({ error: 'Ese slug ya existe' }, { status: 400 });
    }
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
    await sql`DELETE FROM actividades_difusion WHERE id = ${parseInt(params.id)}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
