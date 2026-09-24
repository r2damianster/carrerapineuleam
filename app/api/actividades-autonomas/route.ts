import { NextResponse } from 'next/server';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { obtenerTopes } from '@/lib/topesHoras';

// Horas/actividades autónomas del pasante (planificar, crear recursos, etc.), con tope
// de MAX_HORAS_AUTONOMAS. Las aprueba el supervisor desde /vinculacion/supervisar
// (GET/PATCH /api/vinculacion/supervisar-horas, tipo 'autonomas'); esta ruta es solo del pasante.

async function resumenHoras(sql: NeonQueryFunction<false, false>, usuarioId: number) {
  const [fila] = (await sql`
    SELECT
      COALESCE(SUM(horas) FILTER (WHERE estado_aprobacion <> 'rechazado'), 0)::float AS usadas,
      COALESCE(SUM(horas) FILTER (WHERE estado_aprobacion = 'aprobado'), 0)::float AS aprobadas
    FROM actividades_autonomas_pasante WHERE usuario_id = ${usuarioId}
  `) as any[];
  const topes = await obtenerTopes(sql, usuarioId);
  // Sin tope propio de planificación, el límite es la meta total.
  return { usadas: Number(fila.usadas), aprobadas: Number(fila.aprobadas), maximo: topes.autonomas ?? topes.meta };
}

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol !== 'estudiante') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const usuarioId = Number(usuario.id);

    const actividades = await sql`
      SELECT id, fecha, descripcion, horas::float AS horas, estado_aprobacion, motivo_rechazo
      FROM actividades_autonomas_pasante
      WHERE usuario_id = ${usuarioId}
      ORDER BY fecha DESC, id DESC
    `;
    return NextResponse.json({ success: true, data: actividades, resumen: await resumenHoras(sql, usuarioId) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol !== 'estudiante') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { fecha, descripcion, horas } = await request.json();
    const horasNumero = Number(horas);
    if (!fecha || !descripcion?.trim() || !horasNumero || horasNumero <= 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (fecha, descripción, horas)' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = Number(usuario.id);

    const { usadas, maximo } = await resumenHoras(sql, usuarioId);
    const disponibles = Math.max(0, maximo - usadas);
    if (maximo === 0 || horasNumero > disponibles) {
      return NextResponse.json(
        { error: maximo === 0
            ? 'La planificación no está habilitada para tu perfil de horas.'
            : `Máximo ${maximo} h de planificación. Te quedan ${disponibles} h disponibles.` },
        { status: 400 }
      );
    }

    const [creada] = await sql`
      INSERT INTO actividades_autonomas_pasante (usuario_id, fecha, descripcion, horas)
      VALUES (${usuarioId}, ${fecha}, ${descripcion.trim()}, ${horasNumero})
      RETURNING id, fecha, descripcion, horas::float AS horas, estado_aprobacion
    `;
    return NextResponse.json({ success: true, data: creada }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
