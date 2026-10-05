import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarProyecto } from '@/lib/permisosProyecto';

// Valida o rechaza un aporte. Solo el líder/colíder del proyecto al que pertenece el aporte.
// Solo lo validado cuenta para las metas y las horas de reconocimiento.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const aporteId = Number(params.id);
    const [aporte] = await sql`SELECT proyecto_id FROM investigacion_aportes WHERE id = ${aporteId}`;
    if (!aporte) return NextResponse.json({ error: 'Aporte no encontrado' }, { status: 404 });
    if (!(await puedeGestionarProyecto(sql, usuario, aporte.proyecto_id))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { accion, motivo } = await request.json();
    if (accion === 'validar') {
      await sql`
        UPDATE investigacion_aportes
        SET estado_validacion = 'validado', validado_por = ${Number(usuario.id)}, fecha_validacion = now(), motivo_rechazo = NULL
        WHERE id = ${aporteId}
      `;
    } else if (accion === 'rechazar') {
      const motivoLimpio = String(motivo || '').trim();
      if (!motivoLimpio) return NextResponse.json({ error: 'Indica el motivo del rechazo' }, { status: 400 });
      await sql`
        UPDATE investigacion_aportes
        SET estado_validacion = 'rechazado', validado_por = ${Number(usuario.id)}, fecha_validacion = now(), motivo_rechazo = ${motivoLimpio}
        WHERE id = ${aporteId}
      `;
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
