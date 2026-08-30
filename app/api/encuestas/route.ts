import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { beneficiario_id, espacio_id, ciclo_id, nivel_satisfaccion, comentarios } = data;

    if (!beneficiario_id || !espacio_id || !ciclo_id || !nivel_satisfaccion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (nivel_satisfaccion < 1 || nivel_satisfaccion > 5) {
      return NextResponse.json({ error: 'El nivel de satisfacción debe estar entre 1 y 5' }, { status: 400 });
    }

    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const inscrito = await sql`
      SELECT 1 FROM inscripciones_espacio WHERE espacio_id = ${espacio_id} AND beneficiario_id = ${beneficiario_id}
    `;
    if (inscrito.length === 0) {
      return NextResponse.json({ error: 'El beneficiario no está inscrito en ese espacio' }, { status: 400 });
    }

    await sql`
      INSERT INTO encuestas_satisfaccion 
        (beneficiario_id, ciclo_id, nivel_satisfaccion, comentarios)
      VALUES 
        (${beneficiario_id}, ${ciclo_id}, ${nivel_satisfaccion}, ${comentarios || null})
    `;

    return NextResponse.json({ success: true, message: 'Encuesta enviada exitosamente' });
  } catch (error: any) {
    console.error('Encuesta error:', error);
    return NextResponse.json(
      { error: 'Error guardando la encuesta', details: error.message },
      { status: 500 }
    );
  }
}
