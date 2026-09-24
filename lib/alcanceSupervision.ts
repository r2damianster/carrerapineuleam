import type { AppSession } from './session';
import { esLiderVinculacion } from './modulos';

// Alcance de la supervisión (asistencia, podcast, investigación).
// - Supervisor regular: siempre solo los pasantes de SUS espacios (profesor_id = él).
// - Líder de Vinculación / superadmin: puede filtrar por supervisor —
//   'todos' (default), 'yo' (los propios) o el id de un supervisor concreto.
// Devuelve null cuando no hay restricción por supervisor.
export function resolverSupervisorFiltro(usuario: AppSession, supervisorParam: string | null): number | null {
  const propioId = Number(usuario.id);
  if (!esLiderVinculacion(usuario)) return propioId;
  if (!supervisorParam || supervisorParam === 'todos') return null;
  if (supervisorParam === 'yo') return propioId;
  const supervisorId = Number(supervisorParam);
  return Number.isInteger(supervisorId) && supervisorId > 0 ? supervisorId : null;
}

// Supervisores disponibles para el filtro del líder: profesores dueños de espacios de vinculación.
export async function listarSupervisores(sql: any) {
  return sql`
    SELECT DISTINCT u.id, u.nombres, u.apellidos
    FROM usuarios u
    JOIN "espacios_enseñanza" e ON e.profesor_id = u.id
    WHERE e.area = 'vinculacion'
    ORDER BY u.nombres, u.apellidos
  `;
}

// Períodos académicos (ciclos_academicos) más reciente primero — filtro por período.
export async function listarPeriodos(sql: any) {
  return sql`SELECT id, nombre, fecha_inicio, fecha_fin FROM ciclos_academicos ORDER BY fecha_inicio DESC`;
}
