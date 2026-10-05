import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarVinculacion } from '@/lib/modulos';

// Catálogo de entidades beneficiarias reales (ONGs, unidades educativas, ULEAM-FEDU) — separado
// de "espacios" (clubes/aulas), que ocurren DENTRO de una entidad. Un espacio se liga a una vía
// espacios_enseñanza.entidad_id (ver PATCH /api/espacios/[id]).

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || ['secretaria', 'colaborador'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const entidades = await sql`
      SELECT id, nombre, tipo FROM entidades_beneficiarias WHERE activo = true ORDER BY nombre ASC
    `;
    return NextResponse.json({ success: true, data: entidades });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGestionarVinculacion(usuario)) {
      return NextResponse.json({ error: 'Solo el líder de Vinculación puede crear entidades' }, { status: 403 });
    }
    const { nombre, tipo } = await request.json();
    if (!String(nombre || '').trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const [nueva] = await sql`
      INSERT INTO entidades_beneficiarias (nombre, tipo) VALUES (${String(nombre).trim()}, ${tipo || null})
      RETURNING id, nombre, tipo
    `;
    return NextResponse.json({ success: true, data: nueva });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
