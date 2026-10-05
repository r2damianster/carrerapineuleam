// Subsistema de aportantes de Investigación — independiente de Vinculación.
// Tablas: investigacion_aportantes (quién aporta a qué proyecto) e investigacion_aportes (qué aporta,
// ligado opcionalmente a una actividad del plan = meta). Las horas son solo reconocimiento.
// Reglas:
//  - Un pasante de Vinculación (rol `estudiante`) NO puede ser aportante: si aporta, lo hace desde Vinculación.
//  - Pueden ser aportantes: docentes (`profesor`/`admin`) y colaboradores (`colaborador`, cualquier correo).
//  - Agrega y valida el líder/colíder del proyecto (lib/permisosProyecto.ts:puedeGestionarProyecto).
import type { AppSession } from './session';

export type TipoAportante = 'docente' | 'estudiante_apoyo' | 'externo';

export const TIPOS_APORTANTE: { id: TipoAportante; etiqueta: string }[] = [
  { id: 'docente', etiqueta: 'Docente' },
  { id: 'estudiante_apoyo', etiqueta: 'Estudiante de apoyo' },
  { id: 'externo', etiqueta: 'Miembro externo' },
];

export const TIPOS_APORTE = ['actividad', 'evento', 'podcast', 'producto', 'otro'] as const;
export type TipoAporte = (typeof TIPOS_APORTE)[number];

// Roles de cuenta que pueden figurar como aportantes. `estudiante` queda fuera a propósito.
export function rolPuedeSerAportante(rol: string | null | undefined): boolean {
  return rol === 'profesor' || rol === 'admin' || rol === 'colaborador';
}

// Tipo por defecto según el rol de la cuenta (el líder puede afinar entre estudiante de apoyo y externo).
export function tipoAportantePorDefecto(rol: string | null | undefined): TipoAportante {
  return rol === 'colaborador' ? 'externo' : 'docente';
}

// Proyectos a los que la persona aporta hoy (activo en investigacion_aportantes y proyecto activo).
export async function proyectosComoAportante(sql: any, usuarioId: number) {
  return (await sql`
    SELECT p.id, p.nombre_oficial, a.tipo
    FROM investigacion_aportantes a
    JOIN proyectos p ON p.id = a.proyecto_id
    WHERE a.usuario_id = ${usuarioId} AND a.activo = true AND p.activo = true
    ORDER BY p.nombre_oficial ASC
  `) as { id: string; nombre_oficial: string; tipo: TipoAportante }[];
}

// ¿Puede esta sesión registrar aportes en el proyecto? Solo quien es aportante activo de ese proyecto.
export async function puedeRegistrarAporte(sql: any, usuario: AppSession, proyectoId: string): Promise<boolean> {
  if (!rolPuedeSerAportante(usuario.rol)) return false;
  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return false;
  const filas = await sql`
    SELECT 1 FROM investigacion_aportantes
    WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId} AND activo = true
  `;
  return filas.length > 0;
}
