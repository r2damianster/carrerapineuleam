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

    const { name, role, orcid, email, photo, is_leader, order, projects, genero, fecha_nacimiento, grado, posgrado, titulo_especifico } = await request.json();
    if (!name || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
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
