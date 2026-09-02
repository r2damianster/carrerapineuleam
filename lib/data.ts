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

// Footer contexts for different project sections — configures which leader/coleader/email
// and which quick links show in the footer. quickLinks must point to anchors that actually
// exist on the pages using that context (or to real routes) — never assume the Internacionalización
// project's anchors (#inicio/#equipo/#videos/#publicaciones/#noticias) apply elsewhere.
export interface FooterQuickLink {
  label: string;
  href: string;
}

export interface FooterContext {
  title: string; // nombre del proyecto/sección mostrado en el bloque "About" del footer
  description: string; // descripción del proyecto/sección — nunca la de Internacionalización fuera de su propia página
  leader?: { name: string; email: string };
  coleader?: { name: string; email: string };
  contactEmail?: string; // override default contact email
  quickLinks: FooterQuickLink[];
}

// Quick links reused by pages that only have a #contacto section (Contact.tsx) plus
// standard site navigation — Vinculación, Lingüística, Docencia, Mentoring project pages.
const projectPageQuickLinks: FooterQuickLink[] = [
  { label: 'Inicio del sitio', href: '/' },
  { label: 'Contacto', href: '#contacto' },
  { label: 'Publicaciones', href: '/publicaciones' },
  { label: 'Portal PINE', href: '/portal/login' },
];

export const footerContexts: Record<string, FooterContext> = {
  // Default — /investigacion/proyecto-innovacion (Internacionalización), única página que
  // tiene realmente las secciones #inicio/#equipo/#videos/#publicaciones. "Noticias" apunta a
  // la página principal desde Sesión 26 — Alianzas/Noticias/Actividades se movieron ahí por ser
  // contenido general de la carrera, no específico de este proyecto.
  default: {
    title: 'Innovaciones Pedagógicas e Internacionalización',
    description: 'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.',
    leader: { name: 'Arturo Rodríguez', email: 'arturo.rodriguez@uleam.edu.ec' },
    coleader: { name: 'Jhonny Villafuerte', email: 'jhonny.villafuerte@uleam.edu.ec' },
    quickLinks: [
      { label: 'Inicio', href: '#inicio' },
      { label: 'Equipo', href: '#equipo' },
      { label: 'Podcast', href: '#videos' },
      { label: 'Publicaciones', href: '#publicaciones' },
      { label: 'Últimas Noticias', href: '/#noticias' },
    ],
  },
  // Main landing / career page — solo contacto genérico + navegación a los 3 hubs de proyecto.
  // Desde Sesión 26 también aloja Actividades/Noticias/Alianzas (movidas desde Internacionalización,
  // eran contenido general de la carrera, no de ese proyecto específico).
  landing: {
    title: 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros',
    description: 'Universidad Laica Eloy Alfaro de Manabí (ULEAM). Docencia, investigación y vinculación con la sociedad en la formación de docentes de idiomas.',
    contactEmail: 'c.pinextranjeros@uleam.edu.ec',
    quickLinks: [
      { label: 'Investigación', href: '/investigacion/proyecto-innovacion' },
      { label: 'Vinculación', href: '/vinculacion/dinamicas-linguisticas' },
      { label: 'Docencia', href: '/docencia/docencia-innovadora' },
      { label: 'Actividades', href: '#actividades' },
      { label: 'Noticias', href: '#noticias' },
      { label: 'Alianzas', href: '#alianzas' },
      { label: 'Publicaciones', href: '/publicaciones' },
      { label: 'Portal PINE', href: '/portal/login' },
    ],
  },
  // Páginas del sitio principal sin secciones propias (Publicaciones, Boletines, Portal Login) —
  // siguen siendo del proyecto Internacionalización, por eso mantienen a Arturo+Jhonny de contacto.
  general: {
    title: 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros',
    description: 'Universidad Laica Eloy Alfaro de Manabí (ULEAM). Docencia, investigación y vinculación con la sociedad en la formación de docentes de idiomas.',
    leader: { name: 'Arturo Rodríguez', email: 'arturo.rodriguez@uleam.edu.ec' },
    coleader: { name: 'Jhonny Villafuerte', email: 'jhonny.villafuerte@uleam.edu.ec' },
    quickLinks: [
      { label: 'Inicio del sitio', href: '/' },
      { label: 'Proyecto Internacionalización', href: '/investigacion/proyecto-innovacion' },
      { label: 'Publicaciones', href: '/publicaciones' },
      { label: 'Portal PINE', href: '/portal/login' },
    ],
  },
  // Vinculación section — Cynthia Zambrano
  vinculacion: {
    title: 'Dinámicas Lingüísticas en Contextos Locales',
    description: 'Proyecto de vinculación con la sociedad que articula el uso del inglés y otras lenguas en contextos comunitarios y locales de Manabí.',
    leader: { name: 'Cynthia Zambrano', email: 'cynthia.zambrano@uleam.edu.ec' },
    quickLinks: projectPageQuickLinks,
  },
  // Desarrollo de Habilidades Lingüísticas / Lingüística section — Germán Carrera + Cristina Basantes
  linguistica: {
    title: 'Desarrollo de las Habilidades Lingüísticas',
    description: 'Desarrollo de las habilidades lingüísticas del idioma inglés en estudiantes de educación superior en Ecuador.',
    leader: { name: 'German Carrera', email: 'german.carrera@uleam.edu.ec' },
    coleader: { name: 'Cristina Basantes', email: 'maria.basantes@uleam.edu.ec' },
    quickLinks: projectPageQuickLinks,
  },
  // Mentoría section — Verónica Chávez
  mentoring: {
    title: 'Mentoría y Aprendizaje Socioemocional',
    description: 'Desarrollo Humano y perfil profesional en la formación de docentes: Mentoría y Aprendizaje Socioemocional.',
    leader: { name: 'Verónica Chávez', email: 'veronica.chavez@uleam.edu.ec' },
    quickLinks: projectPageQuickLinks,
  },
  // Docencia Innovadora — Verónica (academic commission)
  docencia: {
    title: 'Docencia Innovadora e Interdisciplinaria',
    description: 'Prácticas de aula, estrategias didácticas y productos de podcast generados directamente desde las cátedras de la carrera PINE.',
    leader: { name: 'Verónica Chávez', email: 'veronica.chavez@uleam.edu.ec' },
    quickLinks: projectPageQuickLinks,
  },
  // Red LEA — Jhonny as coordinator. Usa sus propios anchors reales (RedLEAAbout/Testimonios/Galeria/Memoria).
  redlea: {
    title: 'RED LEA',
    description: 'Red de Cooperación para la Investigación Científica sobre Lectura y Escritura Académica — organización independiente sin fines de lucro dedicada a la investigación científica y la innovación pedagógica en Iberoamérica.',
    leader: { name: 'Jhonny Villafuerte', email: 'jhonny.villafuerte@uleam.edu.ec' },
    quickLinks: [
      { label: 'Sobre RED LEA', href: '#sobre' },
      { label: 'Testimonios', href: '#testimonios' },
      { label: 'Galería', href: '#galeria' },
      { label: 'Memoria', href: '#memoria' },
      { label: 'Inicio del sitio', href: '/' },
    ],
  },
};
