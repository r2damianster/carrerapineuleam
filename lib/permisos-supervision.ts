import type { AppSession } from './session';
import { SUPERADMIN_EMAILS } from './superadmin-auth';

// Líder del proyecto de Vinculación (Cynthia Zambrano)
export const LIDER_VINCULACION_EMAIL = 'cynthia.zambrano@uleam.edu.ec';

// Correos de líderes de proyecto con visión global sobre supervisión de vinculación
const LIDERES_PROYECTO_EMAILS = [
  'arturo.rodriguez@uleam.edu.ec',
  'jhonny.villafuerte@uleam.edu.ec',
  'cynthia.zambrano@uleam.edu.ec',
];

/**
 * Determina si un usuario tiene permisos de Superadministrador o Líder de Proyecto,
 * los cuales le permiten supervisar, consultar y evaluar la asistencia de TODOS los pasantes.
 */
export function esSuperAdminOLider(usuario: AppSession | null | undefined): boolean {
  if (!usuario) return false;

  // Email efectivo = el de la sesión activa. Bajo "Ver como" es el del usuario suplantado,
  // así la vista refleja lo que esa persona realmente vería (no el superadmin original).
  const effectiveEmail = (usuario.email || '').toLowerCase();

  // 1. Rol de administrador en usuarios
  if (usuario.rol === 'admin') return true;

  // 2. Módulo superadmin en modulos_acceso
  if (usuario.modulos_acceso?.includes('superadmin')) return true;

  // 3. Email en SUPERADMIN_EMAILS
  if (SUPERADMIN_EMAILS.map(e => e.toLowerCase()).includes(effectiveEmail)) return true;

  // 4. Email en LIDERES_PROYECTO_EMAILS
  if (LIDERES_PROYECTO_EMAILS.includes(effectiveEmail)) return true;

  return false;
}

/**
 * Quién ve la tarjeta "Registros de Vinculación" en /portal/dashboard: los pasantes
 * (rol estudiante), el superadmin y el líder de Vinculación. Los demás profesores
 * supervisan desde su tarjeta "Supervisión de Vinculación", no registran.
 * Solo controla la tarjeta; las rutas siguen protegidas por middleware/permisos-espacio.
 */
export function puedeVerRegistrosVinculacion(usuario: AppSession | null | undefined): boolean {
  if (!usuario) return false;
  if (usuario.rol === 'estudiante') return true;
  const email = (usuario.email || '').toLowerCase();
  if (usuario.modulos_acceso?.includes('superadmin') && SUPERADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) return true;
  return email === LIDER_VINCULACION_EMAIL;
}
