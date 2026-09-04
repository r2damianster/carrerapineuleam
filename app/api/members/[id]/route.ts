import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const [member] = await sql`SELECT * FROM members WHERE id = ${params.id}`;
    if (!member) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    // Aprobar/rechazar cambios propuestos por el profesor desde /portal/perfil
    // (ver lib/perfilSync.ts) — no toca los demás campos del member.
    if (body.aprobar_pendientes || body.rechazar_pendientes) {
      const aprobar = !!body.aprobar_pendientes;
      const [actualizado] = await sql`
        UPDATE members
        SET photo = CASE WHEN ${aprobar} AND pending_photo IS NOT NULL THEN pending_photo ELSE photo END,
            grado = CASE WHEN ${aprobar} AND pending_grado IS NOT NULL THEN pending_grado ELSE grado END,
            posgrado = CASE WHEN ${aprobar} AND pending_posgrado IS NOT NULL THEN pending_posgrado ELSE posgrado END,
            orcid = CASE WHEN ${aprobar} AND pending_orcid IS NOT NULL THEN pending_orcid ELSE orcid END,
            titulo_especifico = CASE WHEN ${aprobar} AND pending_titulo_especifico IS NOT NULL THEN pending_titulo_especifico ELSE titulo_especifico END,
            pending_photo = NULL, pending_grado = NULL, pending_posgrado = NULL,
            pending_orcid = NULL, pending_titulo_especifico = NULL,
            pending_solicitado_por = NULL, pending_fecha_solicitud = NULL,
            updated = now()
        WHERE id = ${params.id}
        RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(actualizado);
    }

    const { name, role, orcid, email, photo, is_leader, order, projects, genero, fecha_nacimiento, grado, posgrado, titulo_especifico } = body;
    if (!name || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const [actualizado] = await sql`
      UPDATE members
      SET name = ${name}, role = ${role}, orcid = ${orcid || null}, email = ${email || ''},
          photo = ${photo || null}, is_leader = ${!!is_leader}, "order" = ${order ?? 0},
          projects = ${projects || []}, genero = ${genero || null}, fecha_nacimiento = ${fecha_nacimiento || null},
          grado = ${grado || null}, posgrado = ${posgrado || null}, titulo_especifico = ${titulo_especifico || null},
          updated = now()
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
    await sql`DELETE FROM members WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
