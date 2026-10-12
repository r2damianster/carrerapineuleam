import type { AppSession } from '@/lib/session';
import { normalizarTexto } from '@/lib/contribucionVinculos';

interface ContribucionAutores {
  creadoPorId: number | null;
  authors: { authorName: string; isCarreraAuthor: boolean; usuarioId?: number | null }[];
}

interface ContribucionConProyecto {
  proyectoId: string | null;
}

export function esSuperadmin(usuario: Pick<AppSession, 'modulos_acceso'>): boolean {
  return usuario.modulos_acceso.includes('superadmin');
}

export function esAdminOSuperadmin(usuario: Pick<AppSession, 'modulos_acceso'>): boolean {
  return usuario.modulos_acceso.includes('admin') || esSuperadmin(usuario);
}

// Dueño = quien la registró (creadoPorId) o autor/coautor de la carrera.
// Autor se decide por usuarioId (asignado al guardar, ver lib/contribucionVinculos.ts).
// Solo si ese autor no tiene usuarioId (filas antiguas o nombre ambiguo) se cae al nombre completo.
function esAutorOCreador(usuario: AppSession, contribucion: ContribucionAutores): boolean {
  const usuarioId = Number(usuario.id);
  if (contribucion.creadoPorId !== null && contribucion.creadoPorId === usuarioId) {
    return true;
  }
  const nombreUsuario = normalizarTexto(usuario.nombres);
  return contribucion.authors.some(autor => {
    if (autor.usuarioId !== null && autor.usuarioId !== undefined) {
      return autor.usuarioId === usuarioId;
    }
    return autor.isCarreraAuthor && normalizarTexto(autor.authorName) === nombreUsuario;
  });
}

// Editar: solo autor/coautor (o quien la registró) y superadmin. El módulo `admin` NO edita lo ajeno.
export function puedeEditarContribucion(usuario: AppSession, contribucion: ContribucionAutores): boolean {
  return esSuperadmin(usuario) || esAutorOCreador(usuario, contribucion);
}

// Aprobar/rechazar un envío externo (enlace/QR) pendiente: admin/superadmin, o el docente que
// generó el enlace (creadoPorId). Nunca el simple coautor por nombre — solo quien recibió el envío.
export function puedeAprobarContribucion(
  usuario: AppSession,
  contribucion: { aprobada: boolean; creadoPorId: number | null }
): boolean {
  if (contribucion.aprobada) return false;
  return esAdminOSuperadmin(usuario) ||
    (contribucion.creadoPorId !== null && contribucion.creadoPorId === Number(usuario.id));
}

// Proyectos donde el usuario es líder o colíder ACTIVO. Se consulta en Neon en cada petición
// (nunca la cookie), igual que lib/permisosProyecto.ts.
export async function proyectosLiderados(sql: any, usuario: AppSession): Promise<Set<string>> {
  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return new Set();
  const filas = await sql`
    SELECT pm.proyecto_id
    FROM proyecto_miembros pm
    JOIN proyectos p ON p.id = pm.proyecto_id
    WHERE pm.usuario_id = ${usuarioId}
      AND pm.activo = true
      AND pm.rol_en_proyecto IN ('lider', 'colider')
      AND p.activo = true
  `;
  return new Set(filas.map((fila: any) => String(fila.proyecto_id)));
}

// Eliminar: solo superadmin o líder/colíder del proyecto de la contribución. Ni el propio autor.
// Sin proyecto asignado (proyectoId NULL) solo el superadmin puede.
export function puedeEliminarContribucion(
  usuario: AppSession,
  contribucion: ContribucionConProyecto,
  proyectosDondeEsLider: Set<string>
): boolean {
  if (esSuperadmin(usuario)) return true;
  return contribucion.proyectoId !== null && proyectosDondeEsLider.has(contribucion.proyectoId);
}
