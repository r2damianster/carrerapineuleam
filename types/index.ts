export interface Member {
  id: string;
  name: string;
  role: string;
  orcid?: string;
  email: string;
  photo?: string;
  is_leader: boolean;
  order: number;
  created: string;
  updated: string;
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
  youtube_url: string;
  description?: string;
  embed_id: string;
  category: string; // relation to video_categories
  published_date: string;
  order: number;
  is_featured: boolean;
  tags?: string[];
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
