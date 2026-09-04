import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    // ?all=true (usado solo por /admin/members) trae también los ocultos
    // (activo=false) para poder reactivarlos — el sitio público nunca lo manda.
    const incluirInactivos = searchParams.get('all') === 'true';

    const sql = neon(process.env.DATABASE_URL!);
    const members = project
      ? await sql`
          SELECT * FROM members
          WHERE ${project} = ANY(projects) AND (${incluirInactivos} OR activo = true)
          ORDER BY COALESCE((project_order->>${project})::int, "order") ASC
        `
      : await sql`
          SELECT * FROM members
          WHERE (${incluirInactivos} OR activo = true)
          ORDER BY "order" ASC
        `;
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

    const { name, role, orcid, email, photo, is_leader, order, projects, genero, fecha_nacimiento, grado, posgrado, titulo_especifico } = await request.json();
    if (!name || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `member_${Date.now()}`;
    const [nuevo] = await sql`
      INSERT INTO members (id, name, role, orcid, email, photo, is_leader, "order", projects, genero, fecha_nacimiento, grado, posgrado, titulo_especifico)
      VALUES (${id}, ${name}, ${role}, ${orcid || null}, ${email || ''}, ${photo || null}, ${!!is_leader}, ${order ?? 0}, ${projects || []}, ${genero || null}, ${fecha_nacimiento || null}, ${grado || null}, ${posgrado || null}, ${titulo_especifico || null})
      RETURNING *
    `;
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
