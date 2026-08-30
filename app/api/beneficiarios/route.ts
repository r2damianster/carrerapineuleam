import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    const beneficiarios = await sql`
      SELECT id, nombres, apellidos, email 
      FROM usuarios 
      WHERE rol = 'beneficiario'
      ORDER BY nombres ASC
    `;

    return NextResponse.json({ success: true, data: beneficiarios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
