import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

// PATCH cubre dos usos, según qué venga en el body:
// - aprobar/enriquecer un registro de difusión pendiente (origen='difusion') —
//   incluye los campos propios del registro de docente: tipo, hora,
//   audiencia_alcanzada, profesores_responsables, proyecto/asignatura (según
//   categoria investigacion/vinculacion/asignatura). Antes de esta versión
//   ninguno de estos 6 campos era editable por PATCH (aunque sí existían en
//   la fila, intactos) ni se mostraba en el formulario de admin — el docente
//   los registraba pero el admin no podía verlos ni corregirlos ahí.
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
    const observaciones = body.observaciones ?? null;
    const fecha = body.fecha ?? null;
    const categoria = body.categoria ?? null;
    const proyecto = body.proyecto ?? null;
    const asignatura = body.asignatura ?? null;
    const tipo = body.tipo ?? null;
    const hora = body.hora ?? null;
    const audiencia_alcanzada = typeof body.audiencia_alcanzada === 'number' ? body.audiencia_alcanzada : null;
    const profesoresResponsables = Array.isArray(body.profesores_responsables)
      ? body.profesores_responsables.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : null;
    const photos = body.photos ?? null;
    const slug = body.slug ?? null;
    const external_link = body.external_link ?? null;
    const project_id = body.project_id ?? null;
    const is_featured = typeof body.is_featured === 'boolean' ? body.is_featured : null;
    const order = typeof body.order === 'number' ? body.order : null;
    const aprobar = !!body.aprobar;
    // Al aprobar una difusión pendiente (origen='difusion'), por defecto se
    // publica como noticia — si no se manda publicar_noticias explícito,
    // aprobar=true implica publicar_noticias=true (si no, la fila quedaba
    // aprobada pero invisible, el bug que motivó este flag). Antes (hasta
    // Sesión 36) el default era publicar_actividades=true, porque
    // ActivityGallery leía actividades_difusion directo — desde que esa
    // galería se migró al Banco de Fotos (fotos table), "actividades" quedó
    // sin ningún componente público que la lea; Noticias es el único canal
    // público real que queda para este flujo.
    const publicarActividades = typeof body.publicar_actividades === 'boolean' ? body.publicar_actividades : null;
    const publicarNoticias = typeof body.publicar_noticias === 'boolean'
      ? body.publicar_noticias
      : (aprobar ? true : null);

    const sql = neon(process.env.DATABASE_URL!);
    const [actualizado] = await sql`
      UPDATE actividades_difusion
      SET titulo = COALESCE(${titulo}, titulo),
          descripcion = COALESCE(${descripcion}, descripcion),
          observaciones = COALESCE(${observaciones}, observaciones),
          fecha = COALESCE(${fecha}, fecha),
          categoria = COALESCE(${categoria}, categoria),
          proyecto = COALESCE(${proyecto}, proyecto),
          asignatura = COALESCE(${asignatura}, asignatura),
          tipo = COALESCE(${tipo}, tipo),
          hora = COALESCE(${hora}, hora),
          audiencia_alcanzada = COALESCE(${audiencia_alcanzada}, audiencia_alcanzada),
          profesores_responsables = COALESCE(${profesoresResponsables}, profesores_responsables),
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
