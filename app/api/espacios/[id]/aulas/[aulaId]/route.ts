import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarVinculacion } from '@/lib/modulos';

export async function PATCH(request: Request, { params }: { params: { id: string; aulaId: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGestionarVinculacion(usuario)) {
      return NextResponse.json({ error: 'Solo el líder de Vinculación puede administrar aulas' }, { status: 403 });
    }
    const { nombre, activa } = await request.json();
    const sql = neon(process.env.DATABASE_URL!);
    const [aula] = await sql`
      UPDATE aulas SET
        nombre = COALESCE(${nombre ?? null}, nombre),
        activa = COALESCE(${activa ?? null}, activa)
      WHERE id = ${parseInt(params.aulaId)} AND espacio_id = ${parseInt(params.id)}
      RETURNING id, nombre, activa
    `;
    if (!aula) return NextResponse.json({ error: 'Aula no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data: aula });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string; aulaId: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGestionarVinculacion(usuario)) {
      return NextResponse.json({ error: 'Solo el líder de Vinculación puede administrar aulas' }, { status: 403 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    // aula_id en espacio_instructores/inscripciones_espacio es ON DELETE SET NULL — borrar el
    // aula libera esas asignaciones en vez de bloquearse por FK.
    await sql`DELETE FROM aulas WHERE id = ${parseInt(params.aulaId)} AND espacio_id = ${parseInt(params.id)}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
