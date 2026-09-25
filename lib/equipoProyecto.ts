// Equipos por proyecto (Sesión 51). Fuente de verdad de "quién está en qué proyecto y con qué rol":
// la tabla proyecto_miembros (proyecto_id → proyectos, usuario_id → usuarios). Las tarjetas
// públicas (members) se enlazan a la persona por members.usuario_id y ya no guardan proyectos.
// Sin imports de Node/Neon a nivel de módulo: recibe el cliente `sql` desde el handler.
import { recalcularModulos } from './permisosPertenencia';

export const ROLES_PROYECTO = ['lider', 'colider', 'supervisor', 'vinculacion', 'participante'] as const;
export type RolProyecto = (typeof ROLES_PROYECTO)[number];

export const ETIQUETA_ROL_PROYECTO: Record<RolProyecto, string> = {
  lider: 'Líder',
  colider: 'Colíder',
  supervisor: 'Supervisor',
  vinculacion: 'Vinculación',
  participante: 'Participante',
};

// Clave de t.team.badges (lib/i18n.tsx) para cada rol en proyecto.
export const CLAVE_BADGE_ROL_PROYECTO: Record<RolProyecto, string> = {
  lider: 'leader',
  colider: 'coleader',
  supervisor: 'supervisor',
  vinculacion: 'vinculacion',
  participante: 'participant',
};

export function esRolProyecto(valor: unknown): valor is RolProyecto {
  return typeof valor === 'string' && (ROLES_PROYECTO as readonly string[]).includes(valor);
}

// Parte "Nombre Nombre Apellido Apellido" para crear una persona de directorio sin cuenta.
// Con 3+ palabras: las dos últimas son apellidos; con 2: una y una. Se puede corregir después.
export function separarNombreCompleto(nombreCompleto: string): { nombres: string; apellidos: string } {
  const palabras = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length <= 1) return { nombres: palabras[0] || '', apellidos: '' };
  const cantidadApellidos = palabras.length >= 3 ? 2 : 1;
  return {
    nombres: palabras.slice(0, palabras.length - cantidadApellidos).join(' '),
    apellidos: palabras.slice(palabras.length - cantidadApellidos).join(' '),
  };
}

// Crea (o reutiliza) una persona de directorio: fila en usuarios sin rol ni login
// (rol NULL, activado=false), igual que los externos de /utilidades. Devuelve su id.
export async function crearPersonaDirectorio(sql: any, nombreCompleto: string): Promise<number> {
  const { nombres, apellidos } = separarNombreCompleto(nombreCompleto);
  const identificador = `${nombres}.${apellidos}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const correoDirectorio = `externo.${identificador}.${Date.now()}@sin-email.pine`;
  const [fila] = await sql`
    INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, activado, modulos_acceso)
    VALUES (${nombres}, ${apellidos}, ${correoDirectorio},
            (SELECT password_hash FROM usuarios WHERE rol IS NULL AND activado = false LIMIT 1),
            NULL, false, '{}')
    RETURNING id
  `;
  return Number(fila.id);
}

// Deja el equipo de una persona exactamente como pide el admin: los proyectos marcados
// (conservando su rol previo salvo que se indique uno) y elimina los desmarcados.
export async function sincronizarProyectosDePersona(
  sql: any,
  usuarioId: number,
  proyectos: string[],
  rolesPorProyecto: Record<string, string> | undefined,
  ordenPorDefecto: number,
  ordenesPorProyecto?: Record<string, number | string>
) {
  for (const proyectoId of proyectos) {
    const rolIndicado = rolesPorProyecto?.[proyectoId];
    const rol: RolProyecto | null = esRolProyecto(rolIndicado) ? rolIndicado : null;
    // Orden explícito dentro de este proyecto (1 = primero); sin él, un miembro nuevo hereda el orden por defecto
    // y uno existente conserva el suyo.
    const ordenTexto = ordenesPorProyecto?.[proyectoId];
    const ordenIndicado = ordenTexto !== undefined && ordenTexto !== '' && Number.isFinite(Number(ordenTexto)) ? Math.trunc(Number(ordenTexto)) : null;
    await sql`
      INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol_en_proyecto, orden, activo)
      SELECT ${proyectoId}, ${usuarioId}, COALESCE(${rol}, 'participante'), COALESCE(${ordenIndicado}::int, ${ordenPorDefecto}::int), true
      WHERE EXISTS (SELECT 1 FROM proyectos WHERE id = ${proyectoId})
      ON CONFLICT (proyecto_id, usuario_id) DO UPDATE
        SET rol_en_proyecto = COALESCE(${rol}, proyecto_miembros.rol_en_proyecto),
            orden = COALESCE(${ordenIndicado}::int, proyecto_miembros.orden), activo = true
    `;
  }
  await sql`
    DELETE FROM proyecto_miembros
    WHERE usuario_id = ${usuarioId} AND NOT (proyecto_id = ANY(${proyectos}::text[]))
  `;
  // Ser supervisor/líder de un proyecto concede (o retira) los módulos derivados (ver lib/permisosPertenencia.ts).
  await recalcularModulos(sql, usuarioId);
}
