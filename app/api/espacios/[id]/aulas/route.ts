import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';
import { puedeGestionarVinculacion } from '@/lib/modulos';

// Subaulas de un espacio (punto 3) — GET: cualquiera que opere el espacio (para poblar el
// selector en /vinculacion/asistencia). POST: solo el líder de Vinculación/superadmin.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const espacioId = parseInt(params.id);
    if (!(await puedeOperarEspacio(usuario, espacioId))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const aulas = await sql`SELECT id, nombre, activa FROM aulas WHERE espacio_id = ${espacioId} ORDER BY nombre`;
    const [espacio] = await sql`SELECT usa_aulas FROM "espacios_enseñanza" WHERE id = ${espacioId}`;
    return NextResponse.json({ success: true, data: aulas, usa_aulas: !!espacio?.usa_aulas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGestionarVinculacion(usuario)) {
      return NextResponse.json({ error: 'Solo el líder de Vinculación puede administrar aulas' }, { status: 403 });
    }
    const espacioId = parseInt(params.id);
    const { nombre } = await request.json();
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del aula es obligatorio' }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const [aula] = await sql`
      INSERT INTO aulas (espacio_id, nombre) VALUES (${espacioId}, ${nombre.trim()})
      RETURNING id, nombre, activa
    `;
    return NextResponse.json({ success: true, data: aula }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
