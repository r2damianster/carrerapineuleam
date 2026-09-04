export interface Member {
  id: string;
  name: string;
  role: string;
  orcid?: string;
  email: string;
  photo?: string;
  // Datos internos, no renderizados en la tarjeta pública (TeamCard) —
  // solo almacenados para uso futuro/estadístico. Sesión 29.
  genero?: string;
  fecha_nacimiento?: string;
  // Título académico, separado de `name` (que solo lleva el nombre) — se
  // compone al renderizar en TeamSection. grado/posgrado son opciones fijas
  // (ver ABREVIATURAS_TITULO en TeamSection.tsx); titulo_especifico es texto
  // libre opcional (ej. "Magíster en Docencia e Investigación Educativa"),
  // no se muestra en la tarjeta pública todavía. Sesión 29.
  grado?: string;
  posgrado?: string;
  titulo_especifico?: string;
  is_leader: boolean;
  order: number;
  // Ocultar sin borrar (Sesión 30) — false = no sale en ningún GET público.
  activo: boolean;
  created: string;
  updated: string;
  // Proyectos a los que pertenece este miembro — filtra en qué página de proyecto aparece.
  // Un miembro puede estar en más de uno (ej. colabora en su proyecto propio + en Internacionalización).
  // Valores usados: 'internacionalizacion' | 'vinculacion' | 'desarrollo_habilidades' | 'mentoring'
  projects?: string[];
  // Cola de aprobación: cambios que el propio profesor propuso desde "Mi Perfil"
  // (/portal/perfil) y que todavía no aplican a la tarjeta pública — quedan aquí
  // hasta que contenido_sitio los apruebe o rechace. Mismo patrón que
  // actividades_difusion.aprobado_sitio. Ver app/api/perfil/route.ts.
  pending_photo?: string;
  pending_grado?: string;
  pending_posgrado?: string;
  pending_orcid?: string;
  pending_titulo_especifico?: string;
  pending_solicitado_por?: number;
  pending_fecha_solicitud?: string;
}

export interface Publication {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  publication_date: string;
  doi_link?: string;
  pdf_file?: string;
  cover_image?: string;
  type: 'article' | 'conference' | 'book' | 'other';
  category: 'regional' | 'libros' | 'impacto';
  // Ocultar sin borrar (Sesión 30) — false = no sale en ningún GET público.
  activo: boolean;
  created: string;
  updated: string;
}

export interface VideoCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image?: string;
  order: number;
  is_active: boolean;
  created: string;
  updated: string;
}

export interface Video {
  id: string;
  title: string;
  youtube_url?: string | null; // opcional: se puede registrar el episodio antes de tener el link
  description?: string;
  embed_id?: string | null;
  category: string; // relation to video_categories
  published_date?: string | null;
  order: number;
  is_featured: boolean;
  tags?: string[];
  // Ocultar sin borrar (Sesión 30) — false = no sale en ningún GET público.
  activo: boolean;
  created: string;
  updated: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  featured_image?: string;
  published_date: string;
  is_featured: boolean;
  slug: string;
  external_link?: string;
  project_id?: string; // 'pine', otros proyectos, o undefined para noticias de carrera general
  created: string;
  updated: string;
}

export interface VinculacionEnglishClubPhoto {
  id: string;
  image: string;
  caption: string;
  event_date: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  photos: string[];
  event_date: string;
  category: string; // categoría de actividad (taller, grabacion, etc.)
  created: string;
  updated: string;
  // Nota: Las actividades SIEMPRE pertenecen a la carrera completa.
  // No filtrar por proyecto. Aunque una actividad esté en una sección de proyecto,
  // contribuye a boletines de carrera.
}

export interface SiteSettings {
  id: string;
  key: string;
  value: string;
  section: string;
  created: string;
  updated: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  created: string;
  updated: string;
}

export interface CertificateSigner {
  name: string;
  role: string;
}

export type CertificateType = 'participacion' | 'expositor' | 'reconocimiento';
export type CertificateEntity = 'carrera' | 'proyecto' | 'grupo_investigacion';
export type CertificateLogo = 'proyecto' | 'grupo_investigacion' | 'red_lea' | 'ninguno';

export interface CertificateData {
  type: CertificateType;
  entity: CertificateEntity;
  secondaryLogo: CertificateLogo;
  recipientName: string;
  motiveText: string;
  eventName: string;
  date: string;
  place: string;
  signers: CertificateSigner[];
}

export interface NewsletterItem {
  id: string;
  type: 'news' | 'activity';
  title: string;
  date: string;
  excerpt?: string;
  image?: string;
}

export interface Newsletter {
  id: string;
  year: number;
  bimesterIndex: number;
  items: NewsletterItem[];
}
