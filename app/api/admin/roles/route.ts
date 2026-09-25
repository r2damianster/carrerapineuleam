import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { MODULOS_ASIGNABLES, esDocente, tieneModulo } from '@/lib/modulos';
import { logSuperadminAction } from '@/lib/superadmin-auth';
import { calcularModulosDerivados, calcularModulosDerivadosDeTodos } from '@/lib/permisosPertenencia';

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
  const derivados = await calcularModulosDerivadosDeTodos(sql);
  const conDerivados = usuarios.map((persona: any) => ({ ...persona, modulos_derivados: derivados[Number(persona.id)] || [] }));
  return NextResponse.json({ success: true, data: conDerivados });
}

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
  const finales = anteriores.includes('superadmin') ? [...solicitados, 'superadmin'] : solicitados;

  // Lo que el rol en un proyecto ya concede se llama 'derivado'; lo demás que se marca queda como manual y lo que se
  // desmarca de lo derivado queda excluido (así el admin puede sobrescribir la regla automática).
  const derivados = ['profesor', 'admin'].includes(destino.rol) ? await calcularModulosDerivados(sql, usuarioId) : [];
  const manuales = finales.filter(modulo => !derivados.includes(modulo));
  const excluidos = derivados.filter(modulo => !finales.includes(modulo));
  await sql`UPDATE usuarios SET modulos_acceso = ${finales}, modulos_manuales = ${manuales}, modulos_excluidos = ${excluidos} WHERE id = ${usuarioId}`;

  await logSuperadminAction({
    actor: usuario,
    tipo_accion: 'crud_update',
    tabla_afectada: 'usuarios',
    detalle: `Roles de ${destino.email}: [${anteriores.join(', ')}] -> [${finales.join(', ')}]`,
    resultado: 'ok',
  });

  return NextResponse.json({ success: true, modulos_acceso: finales });
}
