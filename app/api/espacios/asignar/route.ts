import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';
import { resolverAulaInscripcion } from '@/lib/aulasEspacio';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
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
    if (!usuario || usuario.rol === 'secretaria') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { espacio_id, aula_id, beneficiarios_ids } = await request.json();

    if (!espacio_id || !beneficiarios_ids || beneficiarios_ids.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const aula = await resolverAulaInscripcion(sql, Number(espacio_id), aula_id);
    if (!aula.ok) {
      return NextResponse.json({ error: aula.error }, { status: 400 });
    }

    for (const b_id of beneficiarios_ids) {
      await sql`
        INSERT INTO inscripciones_espacio (espacio_id, beneficiario_id, aula_id)
        VALUES (${espacio_id}, ${b_id}, ${aula.aulaId})
        ON CONFLICT (espacio_id, beneficiario_id)
        DO UPDATE SET aula_id = COALESCE(EXCLUDED.aula_id, inscripciones_espacio.aula_id)
      `;
    }

    return NextResponse.json({ success: true, message: 'Beneficiarios asignados correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
