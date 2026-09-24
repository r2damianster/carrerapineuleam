import type { AppSession } from './session';
import { SUPERADMIN_EMAILS } from './superadmin-auth';

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

  const effectiveEmail = (usuario.impersonatedBy?.email || usuario.email || '').toLowerCase();

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

