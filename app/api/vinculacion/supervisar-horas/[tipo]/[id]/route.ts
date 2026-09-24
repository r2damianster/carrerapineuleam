import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeSupervisarVinculacion } from '@/lib/modulos';
import { esSuperAdminOLider } from '@/lib/permisos-supervision';
import { verificarCupo, type TipoHoras } from '@/lib/topesHoras';

// Aprobar/rechazar horas de podcast o actividades de investigación de un pasante.
// Un supervisor regular solo puede sobre pasantes de sus espacios (profesor_id = él).
export async function PATCH(request: Request, { params }: { params: { tipo: string; id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!['podcast', 'investigacion', 'autonomas'].includes(params.tipo)) {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
    }

    const { accion, motivo } = await request.json();
    if (!['aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'accion debe ser aprobar o rechazar' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = parseInt(params.id, 10);
    const supervisorId = Number(usuario.id);

    const [fila] = params.tipo === 'podcast'
      ? await sql`SELECT usuario_id FROM horas_podcast_pasante WHERE id = ${id}`
      : params.tipo === 'autonomas'
      ? await sql`SELECT usuario_id FROM actividades_autonomas_pasante WHERE id = ${id}`
      : await sql`SELECT usuario_id FROM actividades_investigacion_pasante WHERE id = ${id}`;
    if (!fila) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });

    if (!esSuperAdminOLider(usuario)) {
      const [propio] = await sql`
        SELECT 1 FROM espacio_instructores ei
        JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
        WHERE ei.usuario_id = ${fila.usuario_id} AND e.area = 'vinculacion' AND e.profesor_id = ${supervisorId}
        LIMIT 1
      `;
      if (!propio) {
        return NextResponse.json({ error: 'No tienes permiso sobre este pasante.' }, { status: 403 });
      }
    }

    // Límite duro: aprobar no puede acreditar más horas que el tope del pasante para ese tipo.
    if (accion === 'aprobar') {
      const tipoHoras: TipoHoras = params.tipo === 'autonomas' ? 'autonomas' : params.tipo === 'podcast' ? 'podcast' : 'investigacion';
      const [detalle] = params.tipo === 'podcast'
        ? await sql`SELECT horas_total::float AS horas, estado_aprobacion FROM horas_podcast_pasante WHERE id = ${id}`
        : params.tipo === 'autonomas'
        ? await sql`SELECT horas::float AS horas, estado_aprobacion FROM actividades_autonomas_pasante WHERE id = ${id}`
        : await sql`SELECT horas::float AS horas, estado_aprobacion FROM actividades_investigacion_pasante WHERE id = ${id}`;
      // Si ya estaba aprobado no ocupa cupo adicional al re-aprobar.
      if (detalle && detalle.estado_aprobacion !== 'aprobado') {
        const cupo = await verificarCupo(sql, Number(fila.usuario_id), tipoHoras, Number(detalle.horas), { incluirPendientes: false });
        if (!cupo.permitido) {
          return NextResponse.json({ error: `${cupo.mensaje} Sube el tope en Topes de horas o rechaza este registro.` }, { status: 409 });
        }
      }
    }

    const estado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
    const motivoFinal = accion === 'rechazar' ? (motivo || null) : null;

    const [actualizado] = params.tipo === 'podcast'
      ? await sql`
          UPDATE horas_podcast_pasante
          SET estado_aprobacion = ${estado}, aprobado_por = ${supervisorId}, fecha_aprobacion = now(), motivo_rechazo = ${motivoFinal}
          WHERE id = ${id} RETURNING *`
      : params.tipo === 'autonomas'
      ? await sql`
          UPDATE actividades_autonomas_pasante
          SET estado_aprobacion = ${estado}, aprobado_por = ${supervisorId}, fecha_aprobacion = now(), motivo_rechazo = ${motivoFinal}
          WHERE id = ${id} RETURNING *`
      : await sql`
          UPDATE actividades_investigacion_pasante
          SET estado_aprobacion = ${estado}, aprobado_por = ${supervisorId}, fecha_aprobacion = now(), motivo_rechazo = ${motivoFinal}
          WHERE id = ${id} RETURNING *`;

    return NextResponse.json({ success: true, data: actualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
