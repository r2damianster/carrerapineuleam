import type { AppSession } from './session';
import { proyectosGestionables, puedeAdministrarSitio } from './permisosProyecto';

// ¿Puede este usuario generar un enlace de acceso temporal para que alguien
// SIN cuenta registre un evento/podcast (ver enlaces_difusion)? Decisión
// explícita del usuario: quienes ya registran difusión directamente hoy —
// profesores con módulo vinculacion o investigacion — más contenido_sitio
// (quienes aprueban al final). Nunca estudiantes-instructores ni admin-only
// (indicadores).
const MODULOS_HABILITADOS = ['vinculacion', 'investigacion', 'contenido_sitio'];

function puedeGenerarEnlaceDifusionPorModulo(usuario: Pick<AppSession, 'rol' | 'modulos_acceso'>): boolean {
  return ['profesor', 'admin'].includes(usuario.rol) &&
    usuario.modulos_acceso.some(m => MODULOS_HABILITADOS.includes(m));
}

// Sesión 53: además de los módulos de siempre, cualquier líder/colíder de un proyecto puede
// generar el enlace para SU proyecto (el propio POST /api/enlaces-difusion ya restringe los
// `proyectos` del enlace a lo que este usuario puede asignar — validarProyectosAsignables) —
// mismo criterio que ya usa la administración de fotos por proyecto (lib/permisosProyecto.ts).
export async function puedeGenerarEnlaceDifusion(sql: any, usuario: AppSession): Promise<boolean> {
  if (puedeGenerarEnlaceDifusionPorModulo(usuario)) return true;
  if (puedeAdministrarSitio(usuario)) return true;
  const gestionables = await proyectosGestionables(sql, usuario);
  return gestionables.length > 0;
}
