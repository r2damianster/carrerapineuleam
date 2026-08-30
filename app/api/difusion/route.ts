import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      titulo,
      tipo,
      fecha,
      hora,
      ciclo_id,
      audiencia_alcanzada,
      evidencia_url,
      categoria, // 'investigacion' | 'vinculacion' | 'asignatura'
      proyecto,
      asignatura,
      descripcion,
      observaciones,
    } = data;
    const registrador_id = usuario.id;

    if (!titulo || !tipo || !fecha || !audiencia_alcanzada) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    await sql`
      INSERT INTO actividades_difusion
        (titulo, tipo, fecha, hora, ciclo_id, registrador_id, audiencia_alcanzada, evidencia_url,
         categoria, proyecto, asignatura, descripcion, observaciones)
      VALUES
        (${titulo}, ${tipo}, ${fecha}, ${hora || null}, ${ciclo_id || null}, ${registrador_id}, ${audiencia_alcanzada}, ${evidencia_url || null},
         ${categoria || 'vinculacion'}, ${proyecto || null}, ${asignatura || null}, ${descripcion || null}, ${observaciones || null})
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
