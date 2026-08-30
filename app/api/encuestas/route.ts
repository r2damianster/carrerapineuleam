import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getUserSessionFromCookies } from '@/lib/userSession';

export async function POST(request: Request) {
  try {
    const usuario = await getUserSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { beneficiario_id, ciclo_id, nivel_satisfaccion, comentarios } = data;

    if (!beneficiario_id || !ciclo_id || !nivel_satisfaccion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (nivel_satisfaccion < 1 || nivel_satisfaccion > 5) {
      return NextResponse.json({ error: 'El nivel de satisfacción debe estar entre 1 y 5' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    await sql`
      INSERT INTO encuestas_satisfaccion 
        (beneficiario_id, ciclo_id, nivel_satisfaccion, comentarios)
      VALUES 
        (${beneficiario_id}, ${ciclo_id}, ${nivel_satisfaccion}, ${comentarios || null})
    `;

    return NextResponse.json({ success: true, message: 'Encuesta enviada exitosamente' });
  } catch (error: any) {
    console.error('Encuesta error:', error);
    return NextResponse.json(
      { error: 'Error guardando la encuesta', details: error.message },
      { status: 500 }
    );
  }
}
