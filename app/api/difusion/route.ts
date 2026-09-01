import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      titulo,
      tipo,
      fecha,
      hora,
      ciclo_id,
      audiencia_alcanzada,
      evidencia_url,
      categoria, // 'investigacion' | 'vinculacion' | 'asignatura'
      proyecto,
      asignatura,
      descripcion,
      observaciones,
      profesores_responsables,
    } = data;
    const registrador_id = usuario.id;

    if (!titulo || !tipo || !fecha || !audiencia_alcanzada) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const responsablesIds = Array.isArray(profesores_responsables)
      ? profesores_responsables.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : [];

    if (responsablesIds.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar al menos un profesor responsable' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const profesoresValidos = await sql`
      SELECT id FROM usuarios WHERE id = ANY(${responsablesIds}) AND rol = 'profesor'
    `;
    if (profesoresValidos.length !== responsablesIds.length) {
      return NextResponse.json({ error: 'Uno o más profesores responsables no son válidos' }, { status: 400 });
    }

    const periodo_academico = calcularPeriodoAcademico(new Date(fecha));

    await sql`
      INSERT INTO actividades_difusion
        (titulo, tipo, fecha, hora, ciclo_id, registrador_id, audiencia_alcanzada, evidencia_url,
         categoria, proyecto, asignatura, descripcion, observaciones, profesores_responsables, periodo_academico)
      VALUES
        (${titulo}, ${tipo}, ${fecha}, ${hora || null}, ${ciclo_id || null}, ${registrador_id}, ${audiencia_alcanzada}, ${evidencia_url || null},
         ${categoria || 'vinculacion'}, ${proyecto || null}, ${asignatura || null}, ${descripcion || null}, ${observaciones || null}, ${responsablesIds}, ${periodo_academico})
    `;

    return NextResponse.json({ success: true, message: 'Actividad registrada exitosamente' });
  } catch (error: any) {
    console.error('Difusion save error:', error);
    return NextResponse.json(
      { error: 'Error guardando la actividad de difusión', details: error.message },
      { status: 500 }
    );
  }
}
