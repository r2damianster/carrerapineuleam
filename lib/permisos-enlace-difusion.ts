import type { AppSession } from './session';

// ¿Puede este usuario generar un enlace de acceso temporal para que alguien
// SIN cuenta registre un evento/podcast (ver enlaces_difusion)? Decisión
// explícita del usuario: solo quienes ya registran difusión directamente
// hoy — profesores con módulo vinculacion o investigacion — más
// contenido_sitio (quienes aprueban al final). Nunca estudiantes-instructores
// ni admin-only (indicadores).
const MODULOS_HABILITADOS = ['vinculacion', 'investigacion', 'contenido_sitio'];

export function puedeGenerarEnlaceDifusion(usuario: Pick<AppSession, 'rol' | 'modulos_acceso'>): boolean {
  return ['profesor', 'admin'].includes(usuario.rol) &&
    usuario.modulos_acceso.some(m => MODULOS_HABILITADOS.includes(m));
}
