import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

// Lista liviana de pasantes (rol estudiante) para selectores de "quién más
// participó" — distinto de /api/estudiantes (CRUD completo, solo
// profesor/admin con módulo vinculacion). Cualquier usuario logueado puede
// pedir esta lista, mismo patrón que /api/profesores.
export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const estudiantes = await sql`
      SELECT id, nombres, apellidos
      FROM usuarios
      WHERE rol = 'estudiante' AND activado = true
      ORDER BY nombres, apellidos
    `;

    return NextResponse.json({ estudiantes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
