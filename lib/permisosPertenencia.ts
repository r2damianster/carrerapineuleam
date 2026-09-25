// Permisos por pertenencia a proyectos (Sesión 51).
//
// Algunos módulos de acceso (usuarios.modulos_acceso) se DERIVAN del rol de la persona en un proyecto
// (tabla proyecto_miembros):
//   - supervisor o líder del proyecto 'vinculacion'  → módulo 'vinculacion' (Supervisor)
//   - líder del proyecto 'vinculacion'               → módulo 'vinculacion_gestion' (Líder de Vinculación)
//   - líder de un proyecto del área 'investigacion'  → módulo 'investigacion'
// El resto (admin, contenido_sitio, superadmin, subir_video…) sigue siendo solo manual.
//
// modulos_acceso es el resultado efectivo (lo que leen la cookie, el middleware y las APIs):
//   efectivo = (derivados ∪ modulos_manuales) − modulos_excluidos
// /admin/roles puede añadir un módulo a mano (queda en modulos_manuales) o quitar uno derivado
// (queda en modulos_excluidos); un cambio de rol en un proyecto recalcula el efectivo.
// Solo aplica a docentes (rol profesor/admin). Recibe el cliente `sql` desde el handler (nunca neon() a nivel de módulo).

const ROLES_CON_DERIVACION = ['profesor', 'admin'];

export async function calcularModulosDerivados(sql: any, usuarioId: number): Promise<string[]> {
  const filas = await sql`
    SELECT DISTINCT modulo FROM (
      SELECT 'vinculacion'::text AS modulo FROM proyecto_miembros
        WHERE usuario_id = ${usuarioId} AND activo AND proyecto_id = 'vinculacion' AND rol_en_proyecto IN ('supervisor', 'lider')
      UNION ALL
      SELECT 'vinculacion_gestion' FROM proyecto_miembros
        WHERE usuario_id = ${usuarioId} AND activo AND proyecto_id = 'vinculacion' AND rol_en_proyecto = 'lider'
      UNION ALL
      SELECT 'investigacion' FROM proyecto_miembros pm JOIN proyectos p ON p.id = pm.proyecto_id
        WHERE pm.usuario_id = ${usuarioId} AND pm.activo AND pm.rol_en_proyecto = 'lider' AND p.area = 'investigacion'
    ) derivados
  `;
  return filas.map((fila: any) => String(fila.modulo));
}

// Módulos derivados de todos los docentes de una vez (para marcarlos en /admin/roles).
export async function calcularModulosDerivadosDeTodos(sql: any): Promise<Record<number, string[]>> {
  const filas = await sql`
    SELECT usuario_id, array_agg(DISTINCT modulo) AS modulos FROM (
      SELECT usuario_id, 'vinculacion'::text AS modulo FROM proyecto_miembros
        WHERE activo AND proyecto_id = 'vinculacion' AND rol_en_proyecto IN ('supervisor', 'lider')
      UNION ALL
      SELECT usuario_id, 'vinculacion_gestion' FROM proyecto_miembros
        WHERE activo AND proyecto_id = 'vinculacion' AND rol_en_proyecto = 'lider'
      UNION ALL
      SELECT pm.usuario_id, 'investigacion' FROM proyecto_miembros pm JOIN proyectos p ON p.id = pm.proyecto_id
        WHERE pm.activo AND pm.rol_en_proyecto = 'lider' AND p.area = 'investigacion'
    ) derivados GROUP BY usuario_id
  `;
  const mapa: Record<number, string[]> = {};
  for (const fila of filas) mapa[Number(fila.usuario_id)] = fila.modulos;
  return mapa;
}

// Recalcula modulos_acceso de una persona tras cambiar su pertenencia. Devuelve el efectivo, o null si no aplica.
export async function recalcularModulos(sql: any, usuarioId: number): Promise<string[] | null> {
  const [persona] = await sql`
    SELECT rol, modulos_acceso, modulos_manuales, modulos_excluidos FROM usuarios WHERE id = ${usuarioId}
  `;
  if (!persona || !ROLES_CON_DERIVACION.includes(persona.rol)) return null;

  const derivados = await calcularModulosDerivados(sql, usuarioId);
  const excluidos: string[] = persona.modulos_excluidos || [];
  const efectivos = Array.from(new Set([...derivados, ...(persona.modulos_manuales || [])])).filter(modulo => !excluidos.includes(modulo));
  // 'superadmin' solo se otorga por doble candado; si ya lo tenía, se conserva.
  if ((persona.modulos_acceso || []).includes('superadmin') && !efectivos.includes('superadmin')) efectivos.push('superadmin');
  // Líder de Vinculación implica Supervisor.
  if (efectivos.includes('vinculacion_gestion') && !efectivos.includes('vinculacion')) efectivos.push('vinculacion');

  await sql`UPDATE usuarios SET modulos_acceso = ${efectivos} WHERE id = ${usuarioId}`;
  return efectivos;
}
