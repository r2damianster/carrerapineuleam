// lib/permisosProyecto.ts
// Capa de permisos por proyecto para administración por líderes (WP2).
// Sin imports de Node/Neon a nivel de módulo — recibe `sql` desde el handler.
// La pertenencia se consulta en Neon en cada petición para evitar desfase de cookie.
// Ver docs/PLAN_IMPLEMENTACION_ANTIGRAVITY_ADMIN_POR_LIDERES.md (Sesión 52).

import type { AppSession } from './session';
import { esDocente } from './modulos';

export const ROLES_GESTORES_PROYECTO = ['lider', 'colider'] as const;
export type RolGestorProyecto = typeof ROLES_GESTORES_PROYECTO[number];

// ── D1: única definición de "administración del sitio" ───────────────────────
// Hoy equivale a Arturo. Un líder/colíder de proyecto NO entra aquí jamás.
// Si en el futuro se quiere excluir 'contenido_sitio', se cambia solo aquí.
export function puedeAdministrarSitio(
  usuario: Pick<AppSession, 'modulos_acceso'> | null | undefined
): boolean {
  const modulos = usuario?.modulos_acceso ?? [];
  return (
    modulos.includes('contenido_sitio') ||
    modulos.includes('admin') ||
    modulos.includes('superadmin')
  );
}

export interface ProyectoGestionable {
  id: string;
  nombre_oficial: string;
  slug: string | null;
  rolEnProyecto: 'admin_sitio' | 'lider' | 'colider';
}

// ── proyectosGestionables ────────────────────────────────────────────────────
// Admin de sitio → todos los proyectos activos con rol ficticio 'admin_sitio'.
// Docente → solo donde es lider/colider ACTIVO en proyecto_miembros.
// Todos los demás → [].
export async function proyectosGestionables(
  sql: any,
  usuario: AppSession
): Promise<ProyectoGestionable[]> {
  if (puedeAdministrarSitio(usuario)) {
    const rows = await sql`
      SELECT id, nombre_oficial, slug
      FROM proyectos
      WHERE activo = true
      ORDER BY nombre_oficial ASC
    `;
    return rows.map((r: any) => ({ ...r, rolEnProyecto: 'admin_sitio' as const }));
  }

  if (!esDocente(usuario)) return [];

  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return [];

  const rows = await sql`
    SELECT p.id, p.nombre_oficial, p.slug, pm.rol_en_proyecto AS "rolEnProyecto"
    FROM proyecto_miembros pm
    JOIN proyectos p ON p.id = pm.proyecto_id
    WHERE pm.usuario_id = ${usuarioId}
      AND pm.activo = true
      AND pm.rol_en_proyecto IN ('lider', 'colider')
      AND p.activo = true
    ORDER BY p.nombre_oficial ASC
  `;
  return rows as ProyectoGestionable[];
}

// ── puedeGestionarProyecto ───────────────────────────────────────────────────
// Admin de sitio → siempre true.
// Docente → true si tiene rol lider/colider ACTIVO en el proyecto dado.
// Todos los demás (secretaria, estudiante, beneficiario) → false.
export async function puedeGestionarProyecto(
  sql: any,
  usuario: AppSession,
  proyectoId: string
): Promise<boolean> {
  if (puedeAdministrarSitio(usuario)) return true;
  if (!esDocente(usuario)) return false;

  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return false;

  const rows = await sql`
    SELECT 1
    FROM proyecto_miembros
    WHERE proyecto_id = ${proyectoId}
      AND usuario_id = ${usuarioId}
      AND activo = true
      AND rol_en_proyecto IN ('lider', 'colider')
  `;
  return rows.length > 0;
}

// ── proyectosAsignables ──────────────────────────────────────────────────────
// Qué proyectos puede asociar una persona al subir un evento/podcast/QR.
// Admin de sitio → todos los activos.
// Docente → los de proyecto_miembros donde está activo con CUALQUIER rol.
// Pasante (estudiante) → regla fija (D5): no usa esta función directamente;
//   el servidor asigna ['vinculacion'] para eventos y ['vinculacion','internacionalizacion']
//   para podcasts. Ver WP5b en el plan.
// Secretaria/beneficiario → [] (el handler devuelve 403 antes de llamar aquí).
export async function proyectosAsignables(
  sql: any,
  usuario: AppSession
): Promise<Array<{ id: string; nombre_oficial: string }>> {
  if (puedeAdministrarSitio(usuario)) {
    return await sql`
      SELECT id, nombre_oficial
      FROM proyectos
      WHERE activo = true
      ORDER BY nombre_oficial ASC
    `;
  }

  if (!esDocente(usuario)) return [];

  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return [];

  return await sql`
    SELECT DISTINCT p.id, p.nombre_oficial
    FROM proyecto_miembros pm
    JOIN proyectos p ON p.id = pm.proyecto_id
    WHERE pm.usuario_id = ${usuarioId}
      AND pm.activo = true
      AND p.activo = true
    ORDER BY p.nombre_oficial ASC
  `;
}

// ── validarProyectosAsignables ───────────────────────────────────────────────
// Valida que proyectosPedidos sea un subconjunto de los asignables por el usuario.
// Lanza un objeto { status, error } que el handler puede usar directamente.
export async function validarProyectosAsignables(
  sql: any,
  usuario: AppSession,
  proyectosPedidos: unknown
): Promise<{ valido: true; ids: string[] } | { valido: false; status: number; error: string }> {
  if (!Array.isArray(proyectosPedidos) || proyectosPedidos.length === 0) {
    return { valido: false, status: 400, error: 'Debes seleccionar al menos un proyecto.' };
  }

  const ids = Array.from(new Set(proyectosPedidos.filter((p): p is string => typeof p === 'string')));
  if (ids.length === 0) {
    return { valido: false, status: 400, error: 'Los IDs de proyecto deben ser strings.' };
  }

  const asignables = await proyectosAsignables(sql, usuario);
  const asignablesSet = new Set(asignables.map(p => p.id));

  for (const id of ids) {
    if (!asignablesSet.has(id)) {
      return { valido: false, status: 403, error: `No puedes asignar el proyecto "${id}".` };
    }
  }

  return { valido: true, ids };
}
