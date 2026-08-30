import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { getSessionFromCookies } from '@/lib/session';

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const nombre = (body.nombre ?? '').trim();
  const contacto = (body.contacto ?? '').trim();

  if (!nombre) {
    return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 });
  }

  const [beneficiario] = await sql`
    INSERT INTO beneficiarios (nombre, contacto)
    VALUES (${nombre}, ${contacto})
    RETURNING id, nombre, contacto, situacion_laboral_inicial
  `;

  return NextResponse.json(beneficiario, { status: 201 });
}
