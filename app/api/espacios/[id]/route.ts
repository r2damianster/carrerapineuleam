import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const espacioId = parseInt(params.id);

    const [actual] = await sql`SELECT area FROM espacios_enseñanza WHERE id = ${espacioId}`;
    if (!actual) return NextResponse.json({ error: 'Espacio no encontrado' }, { status: 404 });
    if (!usuario.modulos_acceso.includes(actual.area)) {
      return NextResponse.json({ error: 'No tienes acceso a ese módulo' }, { status: 403 });
    }

    const { nombre, tipo, ciclo_id } = await request.json();
    if (!nombre || !tipo || !ciclo_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const [actualizado] = await sql`
      UPDATE espacios_enseñanza
      SET nombre = ${nombre}, tipo = ${tipo}, ciclo_id = ${ciclo_id}
      WHERE id = ${espacioId}
      RETURNING id, nombre, tipo, ciclo_id, area
    `;

    return NextResponse.json({ success: true, data: actualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const espacioId = parseInt(params.id);

    const [actual] = await sql`SELECT area FROM espacios_enseñanza WHERE id = ${espacioId}`;
    if (!actual) return NextResponse.json({ error: 'Espacio no encontrado' }, { status: 404 });
    if (!usuario.modulos_acceso.includes(actual.area)) {
      return NextResponse.json({ error: 'No tienes acceso a ese módulo' }, { status: 403 });
    }

    await sql`DELETE FROM espacio_instructores WHERE espacio_id = ${espacioId}`;
    await sql`DELETE FROM espacios_enseñanza WHERE id = ${espacioId}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Restos con FK que no se limpian solos (asistencia, inscripciones,
    // beneficiarios) — se avisa en vez de fallar con un 500 críptico.
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'No se puede eliminar: este espacio tiene beneficiarios inscritos o asistencia registrada.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
