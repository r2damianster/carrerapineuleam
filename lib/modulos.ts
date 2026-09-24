// Catálogo de módulos de acceso (usuarios.modulos_acceso) y helpers de permisos.
// Sin imports de Node/Neon: se usa desde middleware (Edge), APIs y páginas.
// Los módulos se asignan desde /admin/roles; ya no hay listas de emails en el código
// (excepto el doble candado de superadmin, ver lib/superadmin-auth.ts).

export interface ModuloDef {
  id: string;
  etiqueta: string;
  descripcion: string;
  asignable: boolean; // false = no editable desde /admin/roles
}

export const MODULOS: ModuloDef[] = [
  { id: 'vinculacion', etiqueta: 'Supervisor de Vinculación', descripcion: 'Aprueba asistencia, podcast e investigación de los pasantes de sus espacios.', asignable: true },
  { id: 'vinculacion_gestion', etiqueta: 'Líder de Vinculación', descripcion: 'Crea espacios, administra pasantes y supervisa a todos los supervisores. Requiere Supervisor.', asignable: true },
  { id: 'investigacion', etiqueta: 'Investigación', descripcion: 'Docente: gestionar espacios e informes. Pasante: reportar actividades de investigación.', asignable: true },
  { id: 'subir_video', etiqueta: 'Podcast', descripcion: 'Pasante: puede registrar podcasts.', asignable: true },
  { id: 'contenido_sitio', etiqueta: 'Administrador de sitio', descripcion: 'Contenido de la web pública (/admin).', asignable: true },
  { id: 'admin', etiqueta: 'Administración', descripcion: 'Roles de usuarios y borrado de contribuciones.', asignable: true },
  { id: 'superadmin', etiqueta: 'Superadmin', descripcion: 'Acceso absoluto a la base de datos. Solo por doble candado, no editable aquí.', asignable: false },
];

export const MODULOS_ASIGNABLES = MODULOS.filter(modulo => modulo.asignable).map(modulo => modulo.id);

type UsuarioConModulos = { rol?: string; modulos_acceso?: string[] } | null | undefined;

export function tieneModulo(usuario: UsuarioConModulos, modulo: string): boolean {
  return !!usuario?.modulos_acceso?.includes(modulo);
}

export function esDocente(usuario: UsuarioConModulos): boolean {
  return usuario?.rol === 'profesor' || usuario?.rol === 'admin';
}

// Líder de Vinculación (o superadmin): gestiona espacios/pasantes y ve la supervisión de todos.
export function esLiderVinculacion(usuario: UsuarioConModulos): boolean {
  return tieneModulo(usuario, 'vinculacion_gestion') || tieneModulo(usuario, 'superadmin');
}

// Supervisor de vinculación (incluye al líder): aprueba/rechaza actividades y horas de sus pasantes.
export function puedeSupervisarVinculacion(usuario: UsuarioConModulos): boolean {
  return esDocente(usuario) && (tieneModulo(usuario, 'vinculacion') || esLiderVinculacion(usuario));
}

// Gestión (crear espacios, administrar pasantes): solo líder de Vinculación / superadmin.
export function puedeGestionarVinculacion(usuario: UsuarioConModulos): boolean {
  return esDocente(usuario) && esLiderVinculacion(usuario);
}

// Docente de Investigación (líder): espacios e informes.
export function puedeGestionarInvestigacion(usuario: UsuarioConModulos): boolean {
  return esDocente(usuario) && tieneModulo(usuario, 'investigacion');
}
