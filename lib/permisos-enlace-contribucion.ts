import type { AppSession } from './session';

// Solo un DOCENTE (profesor/admin) genera enlaces para recibir contribuciones
// académicas de gente sin cuenta. Nunca estudiantes-instructores, colaboradores
// de Investigación ni secretaria (decisión explícita del usuario).
export function puedeGenerarEnlaceContribucion(usuario: Pick<AppSession, 'rol'>): boolean {
  return ['profesor', 'admin'].includes(usuario.rol);
}
