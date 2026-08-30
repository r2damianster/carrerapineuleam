import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacio_id = searchParams.get('espacio_id');
    if (!espacio_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    if (!(await puedeOperarEspacio(usuario, parseInt(espacio_id)))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const inscritos = await sql`
      SELECT u.id, u.nombres, u.apellidos
      FROM inscripciones_espacio ie
      JOIN usuarios u ON ie.beneficiario_id = u.id
      WHERE ie.espacio_id = ${parseInt(espacio_id)}
      ORDER BY u.apellidos
    `;
    return NextResponse.json({ success: true, data: inscritos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { espacio_id, beneficiarios_ids } = await request.json();

    if (!espacio_id || !beneficiarios_ids || beneficiarios_ids.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    for (const b_id of beneficiarios_ids) {
      await sql`
        INSERT INTO inscripciones_espacio (espacio_id, beneficiario_id)
        VALUES (${espacio_id}, ${b_id})
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({ success: true, message: 'Beneficiarios asignados correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
