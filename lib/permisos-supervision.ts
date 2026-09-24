import type { AppSession } from './session';
import { esLiderVinculacion } from './modulos';

/**
 * ¿Ve y modera la supervisión de TODOS los pasantes? Líder de Vinculación
 * (módulo vinculacion_gestion) o superadmin. Se asigna desde /admin/roles,
 * ya no por listas de emails. Un supervisor regular solo ve los pasantes de
 * los espacios donde espacios_enseñanza.profesor_id es él.
 * Bajo "Ver como" la sesión es la del usuario suplantado, así la vista refleja
 * lo que esa persona realmente vería.
 */
export function esSuperAdminOLider(usuario: AppSession | null | undefined): boolean {
  return !!usuario && esLiderVinculacion(usuario);
}

/**
 * Quién ve la tarjeta "Registros de Vinculación" en /portal/dashboard: los pasantes
 * (rol estudiante), el líder de Vinculación y el superadmin. Solo controla la
 * tarjeta; las rutas siguen protegidas por middleware/permisos-espacio.
 */
export function puedeVerRegistrosVinculacion(usuario: AppSession | null | undefined): boolean {
  if (!usuario) return false;
  return usuario.rol === 'estudiante' || esLiderVinculacion(usuario);
}
