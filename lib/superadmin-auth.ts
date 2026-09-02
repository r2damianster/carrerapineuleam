import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies, type AppSession } from '@/lib/session';

/**
 * Gate del panel /superadmin (acceso absoluto a la Neon: explorador de
 * tablas + consola SQL cruda). Doble candado a propósito:
 *   1. modulos_acceso incluye 'superadmin' (columna editable desde este
 *      mismo panel)
 *   2. el email está en SUPERADMIN_EMAILS, hardcodeado en el repo
 * El punto 2 es la red de seguridad real: si alguien manipulara la columna
 * modulos_acceso desde el propio panel, sin tocar el código no gana acceso.
 * Igual que /utilidades, las API routes de /superadmin no pasan por
 * middleware.ts (su matcher excluye /api) — cada endpoint llama esto directo.
 */
export const SUPERADMIN_EMAILS = ['arturo.rodriguez@uleam.edu.ec'];

export async function requireSuperadmin(): Promise<AppSession | null> {
  const usuario = await getAppSessionFromCookies();
  if (!usuario) return null;
  if (!SUPERADMIN_EMAILS.includes(usuario.email)) return null;
  if (!usuario.modulos_acceso.includes('superadmin')) return null;
  return usuario;
}

const sql = neon(process.env.DATABASE_URL as string);

export async function logSuperadminAction(params: {
  actor: AppSession;
  tipo_accion: 'sql' | 'crud_insert' | 'crud_update' | 'crud_delete';
  tabla_afectada?: string;
  detalle: string;
  resultado?: string;
}): Promise<void> {
  const { actor, tipo_accion, tabla_afectada, detalle, resultado } = params;
  await sql`
    INSERT INTO superadmin_audit_log (actor_id, actor_email, tipo_accion, tabla_afectada, detalle, resultado)
    VALUES (${Number(actor.id)}, ${actor.email}, ${tipo_accion}, ${tabla_afectada ?? null}, ${detalle}, ${resultado ?? null})
  `;
}
