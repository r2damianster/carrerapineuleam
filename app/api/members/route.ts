import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');

    const sql = neon(process.env.DATABASE_URL!);
    const members = project
      ? await sql`SELECT * FROM members WHERE ${project} = ANY(projects) ORDER BY "order" ASC`
      : await sql`SELECT * FROM members ORDER BY "order" ASC`;
    return NextResponse.json(members);
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

    const { name, role, orcid, email, photo, is_leader, order, projects } = await request.json();
    if (!name || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `member_${Date.now()}`;
    const [nuevo] = await sql`
      INSERT INTO members (id, name, role, orcid, email, photo, is_leader, "order", projects)
      VALUES (${id}, ${name}, ${role}, ${orcid || null}, ${email || ''}, ${photo || null}, ${!!is_leader}, ${order ?? 0}, ${projects || []})
      RETURNING *
    `;
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
