import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { sincronizarTitulos } from '@/lib/perfilSync';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = Number(usuario.id);
    const tituloId = parseInt(params.id);

    const [propio] = await sql`SELECT id, nivel FROM perfiles_titulos_academicos WHERE id = ${tituloId} AND usuario_id = ${usuarioId}`;
    if (!propio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const { titulo_especifico, institucion, anio, es_principal } = await request.json();

    if (es_principal) {
      await sql`
        UPDATE perfiles_titulos_academicos SET es_principal = false
        WHERE usuario_id = ${usuarioId} AND nivel = ${propio.nivel}
      `;
    }

    const [actualizado] = await sql`
      UPDATE perfiles_titulos_academicos
      SET titulo_especifico = COALESCE(${titulo_especifico ?? null}, titulo_especifico),
          institucion = COALESCE(${institucion ?? null}, institucion),
          anio = COALESCE(${anio ?? null}, anio),
          es_principal = CASE WHEN ${typeof es_principal === 'boolean'} THEN ${!!es_principal} ELSE es_principal END
      WHERE id = ${tituloId}
      RETURNING *
    `;

    await sincronizarTitulos(sql, usuarioId, usuario.email);
    return NextResponse.json(actualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = Number(usuario.id);
    const tituloId = parseInt(params.id);

    const [propio] = await sql`SELECT id FROM perfiles_titulos_academicos WHERE id = ${tituloId} AND usuario_id = ${usuarioId}`;
    if (!propio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await sql`DELETE FROM perfiles_titulos_academicos WHERE id = ${tituloId}`;
    await sincronizarTitulos(sql, usuarioId, usuario.email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
