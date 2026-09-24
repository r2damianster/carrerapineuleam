import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarVinculacion } from '@/lib/modulos';
import { logSuperadminAction } from '@/lib/superadmin-auth';
import { TIPOS_HORAS, TOPES_POR_DEFECTO, PERFILES_TOPES, avisoSumaTopes, horasContables, type TopesPasante } from '@/lib/topesHoras';

// Tabla de topes de horas por pasante — solo líder de Vinculación / superadmin.
export async function GET() {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !puedeGestionarVinculacion(usuario)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

  // Pasantes de Vinculación: instructores de algún espacio o con horas registradas de cualquier tipo.
  const pasantes = await sql`
    SELECT u.id, u.nombres, u.apellidos, u.email, u.activado,
      t.tope_asistencia::float AS tope_asistencia, t.tope_autonomas::float AS tope_autonomas,
      t.tope_investigacion::float AS tope_investigacion, t.tope_podcast::float AS tope_podcast,
      t.meta_total::float AS meta_total, (t.usuario_id IS NOT NULL) AS tiene_tope_propio,
      COALESCE((SELECT SUM(horas) FROM horas_asistencia_instructor WHERE usuario_id = u.id), 0)::float AS asistencia_aprobadas,
      COALESCE((SELECT SUM(horas) FROM actividades_autonomas_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'aprobado'), 0)::float AS autonomas_aprobadas,
      COALESCE((SELECT SUM(horas) FROM actividades_investigacion_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'aprobado'), 0)::float AS investigacion_aprobadas,
      COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'aprobado'), 0)::float AS podcast_aprobadas,
      COALESCE((SELECT string_agg(DISTINCT p.nombres || ' ' || p.apellidos, ', ')
                FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
                JOIN usuarios p ON p.id = e.profesor_id
                WHERE ei.usuario_id = u.id AND e.area = 'vinculacion'), '') AS supervisores
    FROM usuarios u
    LEFT JOIN topes_horas_pasante t ON t.usuario_id = u.id
    WHERE u.rol = 'estudiante'
      AND (EXISTS (SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
                   WHERE ei.usuario_id = u.id AND e.area = 'vinculacion')
           OR t.usuario_id IS NOT NULL)
    ORDER BY u.nombres, u.apellidos
  `;

  const data = pasantes.map((fila: any) => {
    const topes: TopesPasante = fila.tiene_tope_propio
      ? { asistencia: fila.tope_asistencia, autonomas: fila.tope_autonomas, investigacion: fila.tope_investigacion, podcast: fila.tope_podcast, meta: fila.meta_total }
      : { ...TOPES_POR_DEFECTO };
    const aprobadas = {
      asistencia: fila.asistencia_aprobadas, autonomas: fila.autonomas_aprobadas,
      investigacion: fila.investigacion_aprobadas, podcast: fila.podcast_aprobadas,
    };
    return {
      id: fila.id, nombres: fila.nombres, apellidos: fila.apellidos, email: fila.email, activado: fila.activado,
      supervisores: fila.supervisores, tieneTopePropio: fila.tiene_tope_propio,
      topes, aprobadas, contables: horasContables(aprobadas, topes), aviso: avisoSumaTopes(topes),
    };
  });

  return NextResponse.json({ success: true, data, perfiles: PERFILES_TOPES, tipos: TIPOS_HORAS });
}

function topeValido(valor: any): number | null | undefined {
  if (valor === null || valor === '' || valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 && numero <= 999 ? Math.round(numero * 100) / 100 : undefined;
}

// PATCH { usuario_ids: number[], topes: { asistencia, autonomas, investigacion, podcast, meta } }
// Aplica los mismos topes a uno o varios pasantes (perfil por lote). null = sin tope propio, 0 = no habilitado.
export async function PATCH(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !puedeGestionarVinculacion(usuario)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { usuario_ids, topes } = await request.json();
  const ids: number[] = Array.isArray(usuario_ids) ? usuario_ids.map(Number).filter(Number.isInteger) : [];
  if (ids.length === 0 || !topes) {
    return NextResponse.json({ error: 'usuario_ids y topes son obligatorios' }, { status: 400 });
  }

  const valores = {
    asistencia: topeValido(topes.asistencia),
    autonomas: topeValido(topes.autonomas),
    investigacion: topeValido(topes.investigacion),
    podcast: topeValido(topes.podcast),
    meta: topeValido(topes.meta ?? 96),
  };
  if (Object.values(valores).some(valor => valor === undefined) || valores.meta === null || valores.meta === 0) {
    return NextResponse.json({ error: 'Los topes deben ser números entre 0 y 999 (vacío = sin tope) y la meta mayor que 0.' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const pasantes = await sql`SELECT id FROM usuarios WHERE id = ANY(${ids}) AND rol = 'estudiante'`;
  const idsValidos = pasantes.map((p: any) => Number(p.id));
  if (idsValidos.length === 0) return NextResponse.json({ error: 'Solo se asignan topes a pasantes' }, { status: 400 });

  const actor = Number(usuario.id);
  for (const pasanteId of idsValidos) {
    await sql`
      INSERT INTO topes_horas_pasante (usuario_id, tope_asistencia, tope_autonomas, tope_investigacion, tope_podcast, meta_total, actualizado_por, actualizado_en)
      VALUES (${pasanteId}, ${valores.asistencia}, ${valores.autonomas}, ${valores.investigacion}, ${valores.podcast}, ${valores.meta}, ${actor}, now())
      ON CONFLICT (usuario_id) DO UPDATE SET
        tope_asistencia = EXCLUDED.tope_asistencia, tope_autonomas = EXCLUDED.tope_autonomas,
        tope_investigacion = EXCLUDED.tope_investigacion, tope_podcast = EXCLUDED.tope_podcast,
        meta_total = EXCLUDED.meta_total, actualizado_por = EXCLUDED.actualizado_por, actualizado_en = now()
    `;
  }

  await logSuperadminAction({
    actor: usuario,
    tipo_accion: 'crud_update',
    tabla_afectada: 'topes_horas_pasante',
    detalle: `Topes ${JSON.stringify(valores)} aplicados a pasantes [${idsValidos.join(', ')}]`,
    resultado: 'ok',
  });

  return NextResponse.json({ success: true, actualizados: idsValidos.length, aviso: avisoSumaTopes(valores as TopesPasante) });
}
