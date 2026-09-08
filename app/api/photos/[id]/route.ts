import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { v2 as cloudinary } from 'cloudinary';
import { getAppSessionFromCookies } from '@/lib/session';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    // Toggle rápido de un solo campo (activo) desde la tabla del admin
    if (typeof body.activo === 'boolean' && Object.keys(body).length === 1) {
      const [actualizada] = await sql`
        UPDATE fotos SET activo = ${body.activo}, updated = now()
        WHERE id = ${params.id}
        RETURNING *
      `;
      if (!actualizada) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(actualizada);
    }

    const { titulo, descripcion, ubicaciones, order, activo, posicion } = body;
    const [actualizada] = await sql`
      UPDATE fotos
      SET titulo = ${titulo ?? null}, descripcion = ${descripcion ?? null},
          ubicaciones = ${ubicaciones || []}, "order" = ${order ?? 0},
          activo = COALESCE(${typeof activo === 'boolean' ? activo : null}, activo),
          posicion = ${posicion || 'center'},
          updated = now()
      WHERE id = ${params.id}
      RETURNING *
    `;
    if (!actualizada) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
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
    const [foto] = await sql`SELECT cloudinary_public_id FROM fotos WHERE id = ${params.id}`;
    if (!foto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (foto.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(foto.cloudinary_public_id);
      } catch (err) {
        // Un fallo al borrar en Cloudinary no debe bloquear el borrado en
        // Neon (dejaría la foto imposible de eliminar desde el admin).
        console.error('Cloudinary destroy falló, se borra igual de la tabla:', err);
      }
    }

    await sql`DELETE FROM fotos WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
