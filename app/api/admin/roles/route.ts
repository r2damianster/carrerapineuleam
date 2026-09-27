import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { MODULOS_ASIGNABLES, esDocente, tieneModulo } from '@/lib/modulos';
import { calcularModulosDerivados, recalcularModulos } from '@/lib/permisosPertenencia';
import { logSuperadminAction } from '@/lib/superadmin-auth';

// Asignación de roles (módulos de acceso) — solo módulo 'admin' (hoy: Arturo).
// La cookie del usuario editado se sincroniza sola la próxima vez que abra el
// dashboard (ver app/api/auth/sync).
// Módulos permitidos a pasantes (rol estudiante): el resto es de docentes.
const MODULOS_PASANTE = ['subir_video', 'investigacion'];

export async function GET() {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !esDocente(usuario) || !tieneModulo(usuario, 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  const usuarios = await sql`
    SELECT id, nombres, apellidos, email, rol, activado, modulos_acceso, cargo_institucional
    FROM usuarios
    WHERE rol IN ('profesor', 'admin', 'estudiante')
    ORDER BY CASE rol WHEN 'estudiante' THEN 1 ELSE 0 END, nombres, apellidos
  `;
  return NextResponse.json({ success: true, data: usuarios });
}

// Sesión 53 (H1): reconectado con lib/permisosPertenencia.ts. Para un docente (profesor/admin),
// `solicitados` ya no se escribe directo en modulos_acceso — se separa en modulos_manuales
// (lo que el admin marcó y NO se deriva solo del rol en un proyecto) y modulos_excluidos (lo que
// SÍ se derivaría del rol en un proyecto, pero el admin lo desmarcó a propósito — ej. Jhonny líder
// de RED LEA sin módulo Investigación). recalcularModulos() calcula el efectivo final y lo persiste.
// Un pasante (`estudiante`) no deriva nada de proyectos: sigue con la asignación directa de siempre.
export async function PATCH(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !esDocente(usuario) || !tieneModulo(usuario, 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id, modulos } = await request.json();
  const usuarioId = Number(id);
  if (!Number.isInteger(usuarioId) || !Array.isArray(modulos)) {
    return NextResponse.json({ error: 'id y modulos son obligatorios' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const [destino] = await sql`SELECT id, email, rol, modulos_acceso FROM usuarios WHERE id = ${usuarioId}`;
  if (!destino) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  // Solo módulos del catálogo asignable; 'superadmin' nunca se toca desde aquí (se conserva si ya lo tenía).
  const solicitados: string[] = Array.from(new Set(modulos.filter((m: any) => typeof m === 'string')));
  const invalidos = solicitados.filter(m => !MODULOS_ASIGNABLES.includes(m));
  if (invalidos.length > 0) {
    return NextResponse.json({ error: `Módulos no permitidos: ${invalidos.join(', ')}` }, { status: 400 });
  }
  if (destino.rol === 'estudiante' && solicitados.some(m => !MODULOS_PASANTE.includes(m))) {
    return NextResponse.json({ error: 'A un pasante solo se le asignan Podcast e Investigación.' }, { status: 400 });
  }
  // Líder de Vinculación implica Supervisor.
  if (solicitados.includes('vinculacion_gestion') && !solicitados.includes('vinculacion')) {
    solicitados.push('vinculacion');
  }
  // Antilockout: nadie se quita su propio admin.
  if (usuarioId === Number(usuario.id) && !solicitados.includes('admin')) {
    return NextResponse.json({ error: 'No puedes quitarte tu propio rol de Administración.' }, { status: 400 });
  }

  const anteriores: string[] = destino.modulos_acceso || [];
  let finales: string[];

  if (destino.rol === 'estudiante') {
    // Un pasante no deriva módulos de proyecto_miembros: se mantiene la asignación directa.
    finales = anteriores.includes('superadmin') ? [...solicitados, 'superadmin'] : solicitados;
    await sql`UPDATE usuarios SET modulos_acceso = ${finales} WHERE id = ${usuarioId}`;
  } else {
    const derivados = await calcularModulosDerivados(sql, usuarioId);
    const manuales = solicitados.filter(m => !derivados.includes(m));
    const excluidos = derivados.filter(m => !solicitados.includes(m));
    await sql`UPDATE usuarios SET modulos_manuales = ${manuales}, modulos_excluidos = ${excluidos} WHERE id = ${usuarioId}`;
    finales = (await recalcularModulos(sql, usuarioId)) ?? solicitados;
  }

  await logSuperadminAction({
    actor: usuario,
    tipo_accion: 'crud_update',
    tabla_afectada: 'usuarios',
    detalle: `Roles de ${destino.email}: [${anteriores.join(', ')}] -> [${finales.join(', ')}]`,
    resultado: 'ok',
  });

  return NextResponse.json({ success: true, modulos_acceso: finales });
}
