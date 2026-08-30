import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { getSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modalidad = searchParams.get('modalidad') ?? 'club_ingles';

  const [estudiantes, espacios, beneficiarios] = await Promise.all([
    sql`SELECT id, nombre, carrera, rol, modalidad FROM estudiantes WHERE modalidad = ${modalidad} ORDER BY nombre`,
    sql`SELECT id, nombre, tipo, semestre_activo FROM espacios ORDER BY nombre`,
    sql`SELECT id, nombre, contacto, situacion_laboral_inicial FROM beneficiarios ORDER BY nombre`,
  ]);

  return NextResponse.json({ estudiantes, espacios, beneficiarios });
}
