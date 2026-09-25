import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { v2 as cloudinary } from 'cloudinary';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { puedeAdministrarSitio, puedeGestionarProyecto } from '@/lib/permisosProyecto';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// WP4.4: PATCH ahora acepta también a líderes/colíderes para editar campos
// de sus propias fotos (titulo, descripcion, posicion, order).
// Admin de sitio puede además reasignar proyectos.
// DELETE sigue siendo solo admin de sitio (borra de Cloudinary).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(usuario)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const esAdmin = puedeAdministrarSitio(usuario);

    // Cargar la foto para verificar permisos
    const [foto] = await sql`SELECT id, proyectos, menores, visibilidad FROM fotos WHERE id = ${params.id}`;
    if (!foto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    // Si no es admin, verificar que tenga acceso a esta foto por proyecto
    if (!esAdmin) {
      const proyectosDeFoto: string[] = foto.proyectos ?? [];
      if (proyectosDeFoto.length === 0) {
        return NextResponse.json({ error: 'Sin acceso a esta foto (no pertenece a ningún proyecto tuyo).' }, { status: 403 });
      }
      // Verificar que al menos uno de los proyectos de la foto lo gestiona este usuario
      let tieneAcceso = false;
      for (const pId of proyectosDeFoto) {
        if (await puedeGestionarProyecto(sql, usuario, pId)) { tieneAcceso = true; break; }
      }
      if (!tieneAcceso) return NextResponse.json({ error: 'Sin acceso a esta foto.' }, { status: 403 });
    }

    const body = await request.json();

    // Toggle rápido de activo (atajo legacy para la tabla del admin)
    if (typeof body.activo === 'boolean' && Object.keys(body).length === 1) {
      if (!esAdmin) return NextResponse.json({ error: 'Solo admin puede cambiar visibilidad directamente. Usa la acción "ocultar"/"mostrar".' }, { status: 403 });
      const [actualizada] = await sql`
        UPDATE fotos SET activo = ${body.activo}, updated = now()
        WHERE id = ${params.id} RETURNING *
      `;
      return NextResponse.json(actualizada);
    }

    const { titulo, descripcion, order, posicion, proyectos: proyectosNuevos } = body;
    const posicionValida = Number.isFinite(posicion) ? Math.min(100, Math.max(0, Math.round(posicion))) : undefined;

    // Solo admin puede reasignar proyectos
    if (proyectosNuevos !== undefined && !esAdmin) {
      return NextResponse.json({ error: 'Solo admin puede reasignar proyectos.' }, { status: 403 });
    }

    // Campos que cualquier docente con acceso puede editar
    const [actualizada] = await sql`
      UPDATE fotos
      SET
        titulo      = COALESCE(${titulo !== undefined ? titulo : null}, titulo),
        descripcion = COALESCE(${descripcion !== undefined ? descripcion : null}, descripcion),
        "order"     = COALESCE(${order !== undefined ? order : null}, "order"),
        posicion    = COALESCE(${posicionValida !== undefined ? posicionValida : null}, posicion),
        proyectos   = COALESCE(${esAdmin && proyectosNuevos !== undefined ? proyectosNuevos : null}, proyectos),
        updated     = now()
      WHERE id = ${params.id}
      RETURNING *
    `;
    if (!actualizada) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(actualizada);
  } catch (error: any) {
    if (error.code === '23514') return NextResponse.json({ error: 'Violación de restricción de integridad.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: eliminación DEFINITIVA (fila + archivo en Cloudinary). Solo administración del sitio y solo si es seguro:
//   - la foto debe ser de las que se subieron directamente al banco (origen admin/lider),
//   - debe estar ya DESCARTADA (primero se descarta, luego se puede eliminar),
//   - y su imagen no debe usarse en ningún otro lugar (asistencias, eventos/noticias u otra fila del banco).
// Para todo lo demás se usa "Descartar" (reversible, no borra nada ni rompe asistencias ni informes).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeAdministrarSitio(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [foto] = await sql`SELECT id, url, origen, descartada, cloudinary_public_id FROM fotos WHERE id = ${params.id}`;
    if (!foto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (!['admin', 'lider'].includes(foto.origen)) {
      return NextResponse.json({ error: 'Esta foto viene de una asistencia, evento o podcast: no se elimina, usa "Descartar".' }, { status: 409 });
    }
    if (!foto.descartada) {
      return NextResponse.json({ error: 'Primero descarta la foto; solo una descartada se puede eliminar definitivamente.' }, { status: 409 });
    }
    const [uso] = await sql`
      SELECT
        (SELECT count(*)::int FROM fotos WHERE url = ${foto.url} AND id <> ${foto.id}) AS otras_filas,
        (SELECT count(*)::int FROM asistencia_espacio WHERE foto_url = ${foto.url}) AS asistencias,
        (SELECT count(*)::int FROM actividades_difusion WHERE evidencia_url = ${foto.url} OR ${foto.url} = ANY(photos)) AS actividades`;
    if (uso.otras_filas > 0 || uso.asistencias > 0 || uso.actividades > 0) {
      return NextResponse.json({ error: 'Esta imagen se usa en una asistencia, actividad u otra foto: no se puede eliminar. Déjala descartada.' }, { status: 409 });
    }

    if (foto.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(foto.cloudinary_public_id);
      } catch (err) {
        // Fallo en Cloudinary no bloquea el borrado en Neon
        console.error('Cloudinary destroy falló, se borra igual de la tabla:', err);
      }
    }

    await sql`DELETE FROM fotos WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
