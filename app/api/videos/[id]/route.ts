import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { obtenerAccessToken, actualizarPrivacidad } from '@/lib/youtube';

function extractEmbedId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&\?]{10,12})/);
  return match?.[1] || null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    // Aprobar/rechazar un video propuesto por un profesor (app/portal/subir-video).
    // Rechazar solo borra la fila de nuestro sitio — el video en YouTube queda
    // huérfano/no listado, nunca se borra automáticamente de una plataforma externa.
    if (body.aprobar || body.rechazar) {
      if (body.rechazar) {
        await sql`DELETE FROM videos WHERE id = ${params.id}`;
        return NextResponse.json({ success: true });
      }
      const [actualizado] = await sql`
        UPDATE videos
        SET aprobado_sitio = true, aprobado_por = ${Number(usuario.id)}, fecha_aprobacion = now()
        WHERE id = ${params.id}
        RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

      if (body.hacerPublicoEnYoutube && actualizado.embed_id) {
        try {
          const accessToken = await obtenerAccessToken(sql);
          await actualizarPrivacidad(accessToken, actualizado.embed_id, 'public');
        } catch (error: any) {
          // El video ya quedó aprobado en el sitio aunque falle el cambio de
          // privacidad en YouTube — se informa pero no se revierte la aprobación.
          console.error('Error actualizando privacidad en YouTube:', error);
          return NextResponse.json({ ...actualizado, youtube_public_error: error.message });
        }
      }
      return NextResponse.json(actualizado);
    }

    // Toggle rápido desde la tabla del admin (activo = ocultar sin borrar,
    // is_featured = destacado) — no exige los campos obligatorios del
    // formulario completo. Solo aplica si el body trae únicamente estos campos.
    const soloTogglesRapidos = Object.keys(body).every((key) => key === 'activo' || key === 'is_featured')
      && (typeof body.activo === 'boolean' || typeof body.is_featured === 'boolean');
    if (soloTogglesRapidos) {
      const [actualizado] = await sql`
        UPDATE videos
        SET activo = COALESCE(${typeof body.activo === 'boolean' ? body.activo : null}, activo),
            is_featured = COALESCE(${typeof body.is_featured === 'boolean' ? body.is_featured : null}, is_featured),
            updated = now()
        WHERE id = ${params.id}
        RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(actualizado);
    }

    const { title, youtube_url, description, category, published_date, order, is_featured, tags, activo } = body;
    if (!title || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    const embed_id = youtube_url ? extractEmbedId(youtube_url) : null;

    const [actualizado] = await sql`
      UPDATE videos
      SET title = ${title}, youtube_url = ${youtube_url || null}, embed_id = ${embed_id},
          description = ${description || null}, category = ${category},
          published_date = ${published_date || null}, "order" = ${order ?? 0},
          is_featured = ${!!is_featured}, tags = ${tags || null},
          activo = COALESCE(${typeof activo === 'boolean' ? activo : null}, activo), updated = now()
      WHERE id = ${params.id}
      RETURNING *
    `;
    if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(actualizado);
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
    await sql`DELETE FROM videos WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
