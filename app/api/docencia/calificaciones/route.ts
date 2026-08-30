import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const { ciclo_id, calificaciones } = await request.json();
    
    if (!ciclo_id || !calificaciones || !Array.isArray(calificaciones)) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Inserción o actualización de notas
    for (const item of calificaciones) {
      if (item.nota !== undefined && item.nota !== '') {
        await sql`
          INSERT INTO calificaciones_ciclo (beneficiario_id, ciclo_id, nota_promedio)
          VALUES (${item.beneficiario_id}, ${ciclo_id}, ${parseFloat(item.nota)})
        `;
      }
    }

    return NextResponse.json({ success: true, message: 'Calificaciones registradas correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
