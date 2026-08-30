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
    const {
      titulo,
      tipo,
      fecha,
      ciclo_id,
      audiencia_alcanzada,
      evidencia_url
    } = data;
    const registrador_id = usuario.id;

    if (!titulo || !tipo || !fecha || !audiencia_alcanzada || !evidencia_url) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    await sql`
      INSERT INTO actividades_difusion 
        (titulo, tipo, fecha, ciclo_id, registrador_id, audiencia_alcanzada, evidencia_url)
      VALUES 
        (${titulo}, ${tipo}, ${fecha}, ${ciclo_id || null}, ${registrador_id}, ${audiencia_alcanzada}, ${evidencia_url})
    `;

    return NextResponse.json({ success: true, message: 'Actividad registrada exitosamente' });
  } catch (error: any) {
    console.error('Difusion save error:', error);
    return NextResponse.json(
      { error: 'Error guardando la actividad de difusión', details: error.message },
      { status: 500 }
    );
  }
}
