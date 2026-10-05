import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarProyecto } from '@/lib/permisosProyecto';
import { rolPuedeSerAportante, sincronizarTarjetaWeb, type TipoAportante } from '@/lib/investigacionAportes';

// Equipo de aportantes de un proyecto de Investigación. Solo líder/colíder del proyecto (o administración
// del sitio). Independiente de Vinculación: nada de espacios, pasantes ni horas reglamentarias.

async function autorizar(proyectoId: string) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  if (!(await puedeGestionarProyecto(sql, usuario, proyectoId))) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }
  return { usuario, sql };
}

export async function GET(_request: Request, { params }: { params: { proyectoId: string } }) {
  try {
    const acceso = await autorizar(params.proyectoId);
    if (acceso.error) return acceso.error;
    const { sql } = acceso;
    const proyectoId = params.proyectoId;

    const aportantes = await sql`
      SELECT a.usuario_id, u.nombres, u.apellidos, u.email, u.activado, u.rol, a.tipo, a.activo, a.visible_en_web,
             (SELECT m.activo FROM members m WHERE m.usuario_id = u.id LIMIT 1) AS tarjeta_activa,
             COALESCE((SELECT SUM(horas) FROM investigacion_aportes x WHERE x.proyecto_id = a.proyecto_id AND x.usuario_id = a.usuario_id AND x.estado_validacion = 'validado'), 0)::float AS horas_validadas,
             (SELECT COUNT(*) FROM investigacion_aportes x WHERE x.proyecto_id = a.proyecto_id AND x.usuario_id = a.usuario_id AND x.estado_validacion = 'validado')::int AS aportes_validados,
             (SELECT COUNT(*) FROM investigacion_aportes x WHERE x.proyecto_id = a.proyecto_id AND x.usuario_id = a.usuario_id AND x.estado_validacion = 'pendiente')::int AS aportes_pendientes
      FROM investigacion_aportantes a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.proyecto_id = ${proyectoId}
      ORDER BY a.activo DESC, u.apellidos, u.nombres
    `;
    const aportes = await sql`
      SELECT x.id, x.usuario_id, u.nombres, u.apellidos, x.fecha, x.tipo, x.descripcion, x.horas::float AS horas,
             x.estado_validacion, x.motivo_rechazo, p.actividad AS actividad_plan
      FROM investigacion_aportes x
      JOIN usuarios u ON u.id = x.usuario_id
      LEFT JOIN proyecto_actividades_plan p ON p.id = x.actividad_plan_id
      WHERE x.proyecto_id = ${proyectoId}
      ORDER BY (x.estado_validacion = 'pendiente') DESC, x.fecha DESC, x.id DESC
      LIMIT 300
    `;
    return NextResponse.json({ success: true, aportantes, aportes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Agrega a una persona por correo. Si no tiene cuenta, se crea con rol `colaborador` (sin clave: la fija
// en su primer login, igual que los pasantes). Un pasante de Vinculación (rol estudiante) no puede ser aportante.
export async function POST(request: Request, { params }: { params: { proyectoId: string } }) {
  try {
    const acceso = await autorizar(params.proyectoId);
    if (acceso.error) return acceso.error;
    const { usuario, sql } = acceso;
    const proyectoId = params.proyectoId;

    const { email, nombres, apellidos, tipo, visible_en_web } = await request.json();
    const correo = String(email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      return NextResponse.json({ error: 'Escribe un correo válido' }, { status: 400 });
    }

    const [proyecto] = await sql`SELECT id FROM proyectos WHERE id = ${proyectoId} AND area = 'investigacion' AND activo = true`;
    if (!proyecto) return NextResponse.json({ error: 'Proyecto de investigación no válido' }, { status: 400 });

    let [persona] = await sql`SELECT id, rol FROM usuarios WHERE lower(email) = ${correo}`;
    if (persona && !rolPuedeSerAportante(persona.rol)) {
      const motivo = persona.rol === 'estudiante'
        ? 'Esa persona es pasante de Vinculación: sus aportes los reporta desde Vinculación, no como aportante.'
        : 'Esa cuenta no puede ser aportante de Investigación.';
      return NextResponse.json({ error: motivo }, { status: 400 });
    }

    if (!persona) {
      const nombresLimpios = String(nombres || '').trim();
      const apellidosLimpios = String(apellidos || '').trim();
      if (!nombresLimpios || !apellidosLimpios) {
        return NextResponse.json({ error: 'Esa persona no tiene cuenta: escribe sus nombres y apellidos para crearla' }, { status: 400 });
      }
      const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
      [persona] = await sql`
        INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado)
        VALUES (${nombresLimpios}, ${apellidosLimpios}, ${correo}, ${placeholderHash}, 'colaborador', '{}', false)
        RETURNING id, rol
      `;
    }

    const tipoAportante: TipoAportante = persona.rol === 'profesor' || persona.rol === 'admin'
      ? 'docente'
      : tipo === 'estudiante_apoyo' ? 'estudiante_apoyo' : 'externo';
    const mostrarEnWeb = visible_en_web === true;

    await sql`
      INSERT INTO investigacion_aportantes (proyecto_id, usuario_id, tipo, activo, visible_en_web, agregado_por)
      VALUES (${proyectoId}, ${persona.id}, ${tipoAportante}, true, ${mostrarEnWeb}, ${Number(usuario.id)})
      ON CONFLICT (proyecto_id, usuario_id) DO UPDATE
        SET activo = true, tipo = EXCLUDED.tipo, visible_en_web = EXCLUDED.visible_en_web
    `;
    await sincronizarTarjetaWeb(sql, Number(persona.id), proyectoId, mostrarEnWeb);

    return NextResponse.json({ success: true, usuario_id: persona.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// quitar (conserva el historial: solo se desactiva), reactivar, o cambiar "mostrar en la web".
export async function PATCH(request: Request, { params }: { params: { proyectoId: string } }) {
  try {
    const acceso = await autorizar(params.proyectoId);
    if (acceso.error) return acceso.error;
    const { sql } = acceso;
    const proyectoId = params.proyectoId;

    const { usuario_id, accion, visible_en_web } = await request.json();
    const usuarioId = Number(usuario_id);
    const [aportante] = await sql`
      SELECT activo FROM investigacion_aportantes WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId}
    `;
    if (!aportante) return NextResponse.json({ error: 'Esa persona no es aportante de este proyecto' }, { status: 404 });

    if (accion === 'quitar') {
      await sql`UPDATE investigacion_aportantes SET activo = false, visible_en_web = false WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId}`;
      await sincronizarTarjetaWeb(sql, usuarioId, proyectoId, false);
    } else if (accion === 'reactivar') {
      await sql`UPDATE investigacion_aportantes SET activo = true WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId}`;
    } else if (accion === 'web') {
      if (!aportante.activo) return NextResponse.json({ error: 'Reactiva primero a la persona' }, { status: 400 });
      const mostrar = visible_en_web === true;
      await sql`UPDATE investigacion_aportantes SET visible_en_web = ${mostrar} WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId}`;
      await sincronizarTarjetaWeb(sql, usuarioId, proyectoId, mostrar);
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
