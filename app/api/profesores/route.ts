import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const profesores = await sql`
      SELECT id, nombres, apellidos, email
      FROM usuarios
      WHERE rol = 'profesor'
      ORDER BY nombres, apellidos
    `;

    return NextResponse.json({ profesores });
  } catch (error: any) {
    console.error('Profesores list error:', error);
    return NextResponse.json(
      { error: 'Error obteniendo la lista de profesores', details: error.message },
      { status: 500 }
    );
  }
}
