import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getUserSessionFromCookies } from '@/lib/userSession';

export async function GET() {
  try {
    const usuario = await getUserSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const beneficiarios = await sql`
      SELECT id, nombres, apellidos
      FROM usuarios
      WHERE rol = 'beneficiario'
      ORDER BY nombres ASC
    `;

    return NextResponse.json({ success: true, data: beneficiarios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
