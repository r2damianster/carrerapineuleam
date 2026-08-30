import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const ciclos = await sql`SELECT * FROM ciclos_academicos ORDER BY fecha_inicio DESC`;
    return NextResponse.json({ success: true, data: ciclos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nombre, fecha_inicio, fecha_fin } = await request.json();
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`
      INSERT INTO ciclos_academicos (nombre, fecha_inicio, fecha_fin) 
      VALUES (${nombre}, ${fecha_inicio || null}, ${fecha_fin || null})
      RETURNING *
    `;
    return NextResponse.json({ success: true, data: result[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
