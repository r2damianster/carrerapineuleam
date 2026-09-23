import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireSuperadmin } from '@/lib/superadmin-auth';

export async function GET() {
  const usuario = await requireSuperadmin();
  if (!usuario) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL as string);
    const users = await sql`
      SELECT id, nombres, apellidos, email, cedula, rol, modulos_acceso, activado
      FROM usuarios
      ORDER BY nombres ASC, apellidos ASC
    `;

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error al listar usuarios para impersonar:', error);
    return NextResponse.json({ error: 'Error al consultar usuarios' }, { status: 500 });
  }
}

