import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

const DIAS_VALIDOS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { dia_semana, hora_inicio, hora_fin } = await request.json();
    if (!DIAS_VALIDOS.includes(dia_semana)) {
      return NextResponse.json({ error: 'Día no válido' }, { status: 400 });
    }
    if (!hora_inicio || !hora_fin || hora_inicio >= hora_fin) {
      return NextResponse.json({ error: 'La hora de inicio debe ser anterior a la hora de fin' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = Number(usuario.id);

    const [nueva] = await sql`
      INSERT INTO perfiles_horario_tutorias (usuario_id, dia_semana, hora_inicio, hora_fin)
      VALUES (${usuarioId}, ${dia_semana}, ${hora_inicio}, ${hora_fin})
      RETURNING *
    `;

    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
