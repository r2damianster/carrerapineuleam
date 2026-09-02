import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

const esRating = (v: any) => Number.isInteger(v) && v >= 1 && v <= 5;

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      beneficiario_id, espacio_id, ciclo_id,
      nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios,
      calificaciones_instructores,
    } = data;

    if (!beneficiario_id || !espacio_id || !ciclo_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (![nivel_satisfaccion, aprendizaje, mejora, recursos].every(esRating)) {
      return NextResponse.json({ error: 'Todas las calificaciones deben estar entre 1 y 5' }, { status: 400 });
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

    const instructores = await sql`
      SELECT usuario_id FROM espacio_instructores WHERE espacio_id = ${espacio_id}
    `;
    const idsInstructores = instructores.map(i => i.usuario_id);
    const calificaciones = calificaciones_instructores || {};
    if (idsInstructores.some(id => !esRating(calificaciones[id]))) {
      return NextResponse.json({ error: 'Falta calificar a algún instructor del espacio' }, { status: 400 });
    }

    const [encuesta] = await sql`
      INSERT INTO encuestas_satisfaccion
        (beneficiario_id, ciclo_id, nivel_satisfaccion, aprendizaje, mejora, recursos, comentarios)
      VALUES
        (${beneficiario_id}, ${ciclo_id}, ${nivel_satisfaccion}, ${aprendizaje}, ${mejora}, ${recursos}, ${comentarios || null})
      RETURNING id
    `;

    for (const id of idsInstructores) {
      await sql`
        INSERT INTO encuesta_evaluaciones_instructor (encuesta_id, instructor_id, calificacion)
        VALUES (${encuesta.id}, ${id}, ${calificaciones[id]})
      `;
    }

    return NextResponse.json({ success: true, message: 'Encuesta enviada exitosamente' });
  } catch (error: any) {
    console.error('Encuesta error:', error);
    return NextResponse.json(
      { error: 'Error guardando la encuesta', details: error.message },
      { status: 500 }
    );
  }
}
