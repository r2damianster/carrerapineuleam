import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { registrarHorasAsistencia } from '@/lib/horasAsistencia';

function puedeSupervisar(usuario: { rol: string; modulos_acceso: string[] }) {
  return ['profesor', 'admin'].includes(usuario.rol) && usuario.modulos_acceso.includes('vinculacion');
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisar(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { accion, motivo } = await request.json();
    if (!['aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'accion debe ser aprobar o rechazar' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = parseInt(params.id, 10);

    if (accion === 'rechazar') {
      const [actualizado] = await sql`
        UPDATE asistencia_espacio
        SET estado_aprobacion = 'rechazado', aprobado_por = ${Number(usuario.id)}, fecha_aprobacion = now(), motivo_rechazo = ${motivo || null}
        WHERE id = ${id}
        RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      // Si venía de un aprobado previo, retira las horas ya acreditadas.
      await sql`DELETE FROM horas_asistencia_instructor WHERE asistencia_id = ${id}`;
      return NextResponse.json({ success: true, data: actualizado });
    }

    // Aprobar: las horas se calculan recién acá (hora_inicio/hora_fin ya
    // quedaron guardadas al registrar) — mismo patrón que horas_podcast_pasante.
    const [actualizado] = await sql`
      UPDATE asistencia_espacio
      SET estado_aprobacion = 'aprobado', aprobado_por = ${Number(usuario.id)}, fecha_aprobacion = now(), motivo_rechazo = NULL
      WHERE id = ${id}
      RETURNING *
    `;
    if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (actualizado.hora_inicio && actualizado.hora_fin) {
      await registrarHorasAsistencia(sql, {
        asistenciaId: id,
        espacioId: actualizado.espacio_id,
        horaInicio: actualizado.hora_inicio,
        horaFin: actualizado.hora_fin,
      });
    }

    return NextResponse.json({ success: true, data: actualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
