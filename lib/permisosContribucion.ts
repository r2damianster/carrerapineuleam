import type { AppSession } from '@/lib/session';

interface ContribucionAutores {
  creadoPorId: number | null;
  authors: { authorName: string; isCarreraAuthor: boolean }[];
}

function normalizarNombre(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function esAdminOSuperadmin(usuario: Pick<AppSession, 'modulos_acceso'>): boolean {
  return usuario.modulos_acceso.includes('admin') || usuario.modulos_acceso.includes('superadmin');
}

// Dueño = quien la registró (creadoPorId) o quien aparece como autor/coautor
// de la carrera con su mismo nombre completo (fallback para filas creadas
// antes de que existiera creadoPorId, o cargadas por otra persona en su nombre).
function esAutorOCreador(usuario: AppSession, contribucion: ContribucionAutores): boolean {
  if (contribucion.creadoPorId !== null && contribucion.creadoPorId === Number(usuario.id)) {
    return true;
  }
  const nombreUsuario = normalizarNombre(usuario.nombres);
  return contribucion.authors.some(
    a => a.isCarreraAuthor && normalizarNombre(a.authorName) === nombreUsuario
  );
}

// Autor/coautor y admin/superadmin pueden editar. Nadie más.
export function puedeEditarContribucion(usuario: AppSession, contribucion: ContribucionAutores): boolean {
  return esAdminOSuperadmin(usuario) || esAutorOCreador(usuario, contribucion);
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

// Solo admin/superadmin borran — ni el propio autor/creador.
export function puedeEliminarContribucion(usuario: AppSession): boolean {
  return esAdminOSuperadmin(usuario);
}
