import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getUserSessionFromCookies } from '@/lib/userSession';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    // Obtenemos los espacios y la cantidad de inscritos
    const espacios = await sql`
      SELECT e.*, c.nombre as ciclo_nombre, 
             (SELECT COUNT(*) FROM inscripciones_espacio ie WHERE ie.espacio_id = e.id) as inscritos
      FROM espacios_enseñanza e
      LEFT JOIN ciclos_academicos c ON e.ciclo_id = c.id
      ORDER BY e.id DESC
    `;
    return NextResponse.json({ success: true, data: espacios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getUserSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombre, tipo, ciclo_id } = await request.json();
    if (!nombre || !tipo || !ciclo_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO espacios_enseñanza (nombre, tipo, ciclo_id, profesor_id)
      VALUES (${nombre}, ${tipo}, ${ciclo_id}, ${usuario.id})
    `;
    return NextResponse.json({ success: true, message: 'Espacio creado exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
