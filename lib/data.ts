import type { SiteSettings, VinculacionEnglishClubPhoto } from '@/types';

// ============================================================================
// El contenido del sitio (miembros, publicaciones, podcast, noticias,
// actividades) vive en Neon Postgres desde la Sesión 25 — ver `## Portal PINE`
// / `## Stack Técnico` en CLAUDE.md. Este archivo ya solo guarda config de
// autorización y datos que no se migraron (siteSettings, fotos del Club de
// Inglés).
// ============================================================================

// Fotos del Club de Inglés — proyecto de Vinculación "Dinámicas Lingüísticas en Contextos Locales".
// Array específico del proyecto de vinculación, se irá ampliando con nuevas fotos/actividades del club.
export const vinculacionEnglishClubPhotos: VinculacionEnglishClubPhoto[] = [
  {
    id: 'club_ingles_1',
    image: '/images/ClubIngles-EscenariosLocales-Agosto2026.jpeg',
    caption: 'Club de Inglés desarrollado en escenarios locales',
    event_date: '2026-08-18',
  },
  {
    id: 'club_ingles_2',
    image: '/images/ClubIngles-EscenariosLocales-Agosto2026-2.jpeg',
    caption: 'Club de Inglés desarrollado en escenarios locales',
    event_date: '2026-08-18',
  },
  {
    id: 'club_ingles_3',
    image: '/images/ClubIngles-EscenariosLocales-Agosto2026-3.jpeg',
    caption: 'Club de Inglés desarrollado en escenarios locales',
    event_date: '2026-08-18',
  },
];

export const siteSettings: SiteSettings[] = [
  {
    id: 'setting_1',
    key: 'facebook_url',
    value: 'https://facebook.com/uleam',
    section: 'social',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
  },
  {
    id: 'setting_2',
    key: 'twitter_url',
    value: 'https://twitter.com/uleam',
    section: 'social',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
  },
  {
    id: 'setting_3',
    key: 'instagram_url',
    value: 'https://instagram.com/uleam',
    section: 'social',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
  },
  {
    id: 'setting_4',
    key: 'youtube_url',
    value: 'https://youtube.com/@uleam',
    section: 'social',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
  },
  {
    id: 'setting_5',
    key: 'contact_email',
    value: 'innovacion@uleam.edu.ec',
    section: 'contact',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
  },
];
export const profesorModulos: Record<string, string[]> = {
  'arturo.rodriguez@uleam.edu.ec': ['admin','investigacion','vinculacion','contenido_sitio','Proyecto_Internacionalizacion','indicadores','utilidades'],
  'jhonny.villafuerte@uleam.edu.ec': ['admin','investigacion','contenido_sitio','Proyecto_Internacionalizacion','indicadores','utilidades'],
  'german.carrera@uleam.edu.ec': ['admin','investigacion','indicadores','utilidades'],
  'veronica.chavez@uleam.edu.ec': ['admin','investigacion','indicadores','utilidades'],
  'maria.basantes@uleam.edu.ec': ['investigacion','indicadores','utilidades'], // Cristina Basantes
  'johanna.bello@uleam.edu.ec': ['investigacion','indicadores','utilidades'], // Johana Bello
  'ulbio.farfan@uleam.edu.ec': ['admin','investigacion','vinculacion','Proyecto_Internacionalizacion','indicadores','utilidades'],
  'jorge.corral@uleam.edu.ec': ['admin','investigacion','vinculacion','Proyecto_Internacionalizacion','indicadores','utilidades'],
};


// Lista fija de docentes autorizados a registrarse con rol "profesor" en /registro
// (panel /docencia, /pine-dashboard — tabla usuarios en Neon). No es autoregistro
// abierto: solo estos correos pueden tomar ese rol. Agregar aquí antes de que
// alguien nuevo pueda entrar como profesor.
export const profesoresAutorizados = [
  'arturo.rodriguez@uleam.edu.ec',
  'jhonny.villafuerte@uleam.edu.ec',
  'german.carrera@uleam.edu.ec',
  'veronica.chavez@uleam.edu.ec',
  'maria.basantes@uleam.edu.ec', // Cristina Basantes
  'johanna.bello@uleam.edu.ec', // Johana Bello
  'ulbio.farfan@uleam.edu.ec',
  'jorge.corral@uleam.edu.ec',
];

// Nombre del proyecto propio de cada líder (distinto del proyecto PINE/Internacionalización
// de Arturo+Jhonny, que ya tiene su propia tarjeta "Gestión de MI PROYECTO"). Usado para
// mostrar "Gestionar {proyecto}" en /portal/dashboard según quién esté logueado — sin link
// todavía, no existe panel de edición por proyecto individual.
export const liderProyectoPropio: Record<string, string> = {
  'german.carrera@uleam.edu.ec': 'Desarrollo de Habilidades Lingüísticas',
  'veronica.chavez@uleam.edu.ec': 'Mentoring',
};

// Footer contexts for different project sections — configures which leader/coleader/email shows in footer
export interface FooterContext {
  leader?: { name: string; email: string };
  coleader?: { name: string; email: string };
  contactEmail?: string; // override default contact email
}

export const footerContexts: Record<string, FooterContext> = {
  // Default/Main pages — Internacionalización project
  default: {
    leader: { name: 'Arturo Rodríguez', email: 'arturo.rodriguez@uleam.edu.ec' },
    coleader: { name: 'Jhonny Villafuerte', email: 'jhonny.villafuerte@uleam.edu.ec' },
  },
  // Main landing / career page — only generic contact
  landing: {
    contactEmail: 'c.pinextranjeros@uleam.edu.ec',
  },
  // Vinculación section — Cynthia Zambrano
  vinculacion: {
    leader: { name: 'Cynthia Zambrano', email: 'cynthia.zambrano@uleam.edu.ec' },
  },
  // Desarrollo de Habilidades Lingüísticas / Lingüística section — Germán Carrera + Cristina Basantes
  linguistica: {
    leader: { name: 'German Carrera', email: 'german.carrera@uleam.edu.ec' },
    coleader: { name: 'Cristina Basantes', email: 'maria.basantes@uleam.edu.ec' },
  },
  // Mentoría section — Verónica Chávez
  mentoring: {
    leader: { name: 'Verónica Chávez', email: 'veronica.chavez@uleam.edu.ec' },
  },
  // Docencia Innovadora — Verónica (academic commission)
  docencia: {
    leader: { name: 'Verónica Chávez', email: 'veronica.chavez@uleam.edu.ec' },
  },
  // Red LEA — Jhonny as coordinator
  redlea: {
    leader: { name: 'Jhonny Villafuerte', email: 'jhonny.villafuerte@uleam.edu.ec' },
  },
};
