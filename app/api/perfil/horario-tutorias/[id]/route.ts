import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = Number(usuario.id);
    const franjaId = parseInt(params.id);

    const [propia] = await sql`SELECT id FROM perfiles_horario_tutorias WHERE id = ${franjaId} AND usuario_id = ${usuarioId}`;
    if (!propia) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await sql`DELETE FROM perfiles_horario_tutorias WHERE id = ${franjaId}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
