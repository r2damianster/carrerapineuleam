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
    const {
      beneficiario_id,
      espacio_id,
      tipo, // 'inicial' o 'final'
      puntaje_obtenido,
      nivel_asignado,
      respuestas_json,
      evidencia_url
    } = data;
    const estudiante_evaluador_id = usuario.id;

    if (!beneficiario_id || !espacio_id || !tipo || puntaje_obtenido === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
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
      INSERT INTO evaluaciones_mcer
        (beneficiario_id, estudiante_evaluador_id, tipo, nota, subnivel_actual, respuestas_json, evidencia_url, fecha_evaluacion)
      VALUES
        (${beneficiario_id}, ${estudiante_evaluador_id}, ${tipo}, ${puntaje_obtenido}, ${nivel_asignado}, ${JSON.stringify(respuestas_json)}, ${evidencia_url || null}, CURRENT_DATE)
    `;

    return NextResponse.json({ success: true, message: 'Evaluación registrada exitosamente' });
  } catch (error: any) {
    console.error('Test save error:', error);
    return NextResponse.json(
      { error: 'Error guardando la evaluación', details: error.message },
      { status: 500 }
    );
  }
}
