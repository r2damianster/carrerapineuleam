import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { proyectosComoAportante, puedeRegistrarAporte, TIPOS_APORTE } from '@/lib/investigacionAportes';

// Aportes de la persona que aporta a proyectos de Investigación (docente o colaborador). Los pasantes de
// Vinculación nunca entran aquí. Lo que se registra queda pendiente hasta que lo valida el líder/colíder.

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const usuarioId = Number(usuario.id);
    const proyectos = await proyectosComoAportante(sql, usuarioId);
    const idsProyectos = proyectos.map((proyecto) => proyecto.id);

    // Actividades del plan a las que se puede ligar un aporte (opcional): las activas de sus proyectos.
    const actividadesPlan = idsProyectos.length === 0 ? [] : await sql`
      SELECT a.id, a.actividad, a.unidad, o.proyecto_id, c.nombre AS ciclo
      FROM proyecto_actividades_plan a
      JOIN proyecto_objetivos o ON o.id = a.objetivo_id
      LEFT JOIN ciclos_academicos c ON c.id = a.ciclo_id
      WHERE o.proyecto_id = ANY(${idsProyectos}::text[]) AND a.activo = true
      ORDER BY c.nombre DESC NULLS LAST, a.actividad
    `;
    const aportes = await sql`
      SELECT x.id, x.proyecto_id, x.fecha, x.tipo, x.descripcion, x.horas::float AS horas, x.estado_validacion,
             x.motivo_rechazo, p.actividad AS actividad_plan
      FROM investigacion_aportes x
      LEFT JOIN proyecto_actividades_plan p ON p.id = x.actividad_plan_id
      WHERE x.usuario_id = ${usuarioId}
      ORDER BY x.fecha DESC, x.id DESC
      LIMIT 200
    `;
    return NextResponse.json({ success: true, proyectos, actividadesPlan, aportes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!);
    const { proyecto_id, actividad_plan_id, fecha, tipo, descripcion, horas } = await request.json();

    if (!(await puedeRegistrarAporte(sql, usuario, String(proyecto_id || '')))) {
      return NextResponse.json({ error: 'No eres aportante de ese proyecto' }, { status: 403 });
    }
    const descripcionLimpia = String(descripcion || '').trim();
    if (!descripcionLimpia || !fecha) {
      return NextResponse.json({ error: 'La fecha y la descripción son obligatorias' }, { status: 400 });
    }
    const tipoAporte = (TIPOS_APORTE as readonly string[]).includes(tipo) ? tipo : 'actividad';
    const horasAporte = horas === '' || horas == null ? 0 : Number(horas);
    if (Number.isNaN(horasAporte) || horasAporte < 0 || horasAporte > 100) {
      return NextResponse.json({ error: 'Las horas deben estar entre 0 y 100' }, { status: 400 });
    }

    let actividadPlanId: number | null = null;
    if (actividad_plan_id) {
      const [actividad] = await sql`
        SELECT a.id FROM proyecto_actividades_plan a
        JOIN proyecto_objetivos o ON o.id = a.objetivo_id
        WHERE a.id = ${Number(actividad_plan_id)} AND o.proyecto_id = ${proyecto_id}
      `;
      if (!actividad) return NextResponse.json({ error: 'Esa actividad no pertenece al proyecto' }, { status: 400 });
      actividadPlanId = actividad.id;
    }

    const [creado] = await sql`
      INSERT INTO investigacion_aportes (proyecto_id, usuario_id, actividad_plan_id, fecha, tipo, descripcion, horas)
      VALUES (${proyecto_id}, ${Number(usuario.id)}, ${actividadPlanId}, ${fecha}, ${tipoAporte}, ${descripcionLimpia}, ${horasAporte})
      RETURNING id
    `;
    return NextResponse.json({ success: true, id: creado.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
