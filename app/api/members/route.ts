import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const members = await sql`SELECT * FROM members ORDER BY "order" ASC`;
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

    const { name, role, orcid, email, photo, is_leader, order } = await request.json();
    if (!name || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `member_${Date.now()}`;
    const [nuevo] = await sql`
      INSERT INTO members (id, name, role, orcid, email, photo, is_leader, "order")
      VALUES (${id}, ${name}, ${role}, ${orcid || null}, ${email || ''}, ${photo || null}, ${!!is_leader}, ${order ?? 0})
      RETURNING *
    `;
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
