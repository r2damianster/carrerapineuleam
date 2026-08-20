'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'es' | 'en';

const translations = {
  es: {
    nav: {
      home: 'Inicio',
      about: 'Acerca de',
      team: 'Equipo',
      videos: 'Videos',
      publications: 'Publicaciones',
      news: 'Noticias',
      contact: 'Contacto',
      docencia: 'Docencia',
      investigacion: 'Investigación',
      vinculacion: 'Vinculación',
    },
    hero: {
      title1: 'Innovaciones Pedagógicas',
      title2: 'e Internacionalización',
      subtitle: 'Universidad Laica Eloy Alfaro de Manabí',
      description: 'Transformando la educación a través de la investigación, la innovación y la colaboración internacional',
      ctaProject: 'Conoce el Proyecto',
      ctaVideos: 'Ver Videos',
    },
    about: {
      sectionTitle: 'Acerca del Proyecto',
      sectionSubtitle: 'Un enfoque innovador para transformar la educación en la ULEAM',
      mainTitle: 'Proyecto de Innovaciones Pedagógicas 2025',
      p1: 'Este proyecto de investigación se enfoca en la implementación y análisis de innovaciones pedagógicas en el contexto de la educación superior ecuatoriana, con el objetivo de mejorar los procesos de enseñanza-aprendizaje a través de metodologías innovadoras y la internacionalización de la educación.',
      p2: 'A través de la investigación-acción, buscamos transformar las prácticas áulicas, fomentar la colaboración internacional y crear espacios de diálogo académico que enriquezcan la experiencia educativa de nuestra comunidad universitaria.',
      p3: 'El proyecto incluye la producción de contenidos multimedia, publicaciones científicas, y la creación de redes de colaboración con instituciones nacionales e internacionales.',
      objectivesTitle: 'Objetivos del Proyecto',
      objectives: [
        'Implementar metodologías pedagógicas innovadoras',
        'Fomentar la internacionalización de la educación',
        'Generar publicaciones científicas de calidad',
        'Crear redes de colaboración académica',
        'Producir contenido educativo multimedia',
      ],
      highlights: [
        { title: 'Innovación Pedagógica', description: 'Desarrollo de nuevas metodologías y prácticas educativas que transforman el proceso de enseñanza-aprendizaje.' },
        { title: 'Internacionalización', description: 'Colaboración con instituciones internacionales para fortalecer la calidad educativa y la investigación.' },
        { title: 'Investigación Colaborativa', description: 'Trabajo en equipo entre docentes y estudiantes para generar conocimiento y mejorar la práctica educativa.' },
        { title: 'Podcast Educativo', description: 'Serie de podcasts para difundir experiencias pedagógicas y fomentar el diálogo académico.' },
      ],
    },
    team: {
      sectionTitle: 'Nuestro Equipo',
    },
    publications: {
      sectionTitle: 'Publicaciones Científicas',
      filters: { all: 'Todas', regional: 'Regional', libros: 'Libros', impacto: 'De Impacto' },
      viewBtn: 'Ver →',
      pdfBtn: 'PDF',
      viewAll: 'Ver Todas las Publicaciones →',
    },
    news: {
      sectionTitle: 'Últimas Noticias',
      viewAll: 'Ver Todas las Noticias →',
      readMore: 'Leer más',
    },
    videos: {
      sectionTitle: 'Videos y Contenido Multimedia',
      filterAll: 'Todos',
      productionTitle: '¿Cómo se produce nuestro podcast?',
      productionText: 'Los episodios se transmiten en vivo por Radio ULEAM a través de Facebook. Luego se descargan y se publican en nuestro canal de YouTube "PINE Investigación", donde también se conectan con esta página web.',
      productionFacebookCta: 'Radio ULEAM en Facebook',
      productionYoutubeCta: 'Canal PINE en YouTube',
    },
    connections: {
      sectionTitle: 'Alianzas y Apoyo',
      sectionSubtitle: 'Redes y grupos que respaldan y articulan el trabajo del proyecto',
      group: {
        name: 'Grupo de Investigación',
        title: 'Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad',
        description: 'El proyecto PINE se desarrolla bajo el aval de este grupo de investigación de la ULEAM, que articula líneas de trabajo en inclusión educativa, diálogo intercultural y colaboración interdisciplinaria.',
      },
      redLea: {
        name: 'RED LEA',
        title: 'Red de Cooperación para la Investigación Científica sobre Lectura y Escritura Académica',
        description: 'Red interinstitucional que articula proyectos de investigación, publicaciones conjuntas y producción académica sobre lectura y escritura en contextos universitarios.',
      },
      radioUleam: {
        name: 'Radio ULEAM',
        title: 'Radio ULEAM 101.7 FM',
        description: 'Estación de radio de la Universidad Laica Eloy Alfaro de Manabí que difunde nuestros podcasts educativos en vivo. Síguenos en Facebook para acceder a los episodios transmitidos.',
        url: 'https://www.facebook.com/uleamradio101.7',
      },
    },
    hub: {
      sectionTitle: 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjero - ULEAM',
      sectionSubtitle: 'Proyectos, redes de cooperación y boletines de la carrera',
      groupName: 'Grupo de Investigación',
      pineCard: {
        title: 'Proyecto de Innovaciones Pedagógicas e Internacionalización',
        description: 'Proyecto integral de investigación sobre innovaciones pedagógicas, internacionalización de la educación y transformación de prácticas áulicas en la ULEAM.',
      },
      boletinesCard: {
        title: 'Boletines',
        description: 'Boletines bimensuales que agrupan noticias y actividades de la carrera.',
      },
    },
    boletines: {
      pageTitle: 'Boletines de la Carrera',
      pageSubtitle: 'Resumen bimensual de noticias y actividades',
      bimesterLabels: ['Ene-Feb', 'Mar-Abr', 'May-Jun', 'Jul-Ago', 'Sep-Oct', 'Nov-Dic'],
      newsBadge: 'Noticia',
      activityBadge: 'Actividad',
      noImage: 'Sin imagen',
      empty: 'No hay boletines disponibles',
      newsletters: 'Boletines',
      bimesterPrefix: 'Boletín',
      filterAll: 'Todos',
    },
    activities: {
      sectionTitle: 'Galería de Actividades',
      empty: 'No hay fotos de actividades aún',
    },
    contact: {
      sectionTitle: 'Contáctanos',
      teamTitle: 'Equipo de Contacto',
      socialTitle: 'Redes Sociales',
      formTitle: 'Envíanos un Mensaje',
      namePlaceholder: 'Tu nombre',
      emailPlaceholder: 'Tu correo electrónico',
      messagePlaceholder: 'Tu mensaje...',
      sendBtn: 'Enviar Mensaje',
      leader: 'Líder del Proyecto',
      coleader: 'Colíder del Proyecto',
    },
    footer: {
      description: 'Proyecto de investigación dedicado a la transformación de las prácticas pedagógicas y la internacionalización en la Universidad Laica Eloy Alfaro de Manabí (ULEAM).',
      quickLinks: 'Enlaces Rápidos',
      contact: 'Contacto',
      rights: 'Todos los derechos reservados.',
      leader: 'Líder:',
      coleader: 'Colíder:',
      links: { home: 'Inicio', team: 'Equipo', videos: 'Videos', publications: 'Publicaciones', news: 'Noticias' },
    },
    docenciaProject: {
      navLabel: 'Docencia Innovadora e Interdisciplinaria',
      heroTitle1: 'Docencia Innovadora',
      heroTitle2: 'e Interdisciplinaria',
      heroSubtitle: 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros — ULEAM',
      heroDescription: 'Prácticas de aula, estrategias didácticas y productos de podcast generados directamente desde las cátedras de la carrera PINE.',
      integrationTitle: 'Integración con el Proyecto de Investigación',
      integrationText: 'Los episodios de este espacio se producen junto al Proyecto de Innovaciones Pedagógicas e Internacionalización, que gestiona la producción técnica del podcast institucional (Radio ULEAM y canal de YouTube). Aquí se agrupan los productos que nacen directamente de la práctica docente en las aulas de la carrera.',
      viewProjectCta: 'Ver Proyecto de Innovaciones Pedagógicas e Internacionalización',
      videosSectionTitle: 'Podcasts de Docencia',
      videosSectionSubtitle: 'Episodios producidos como resultado de la práctica áulica en las cátedras de la carrera PINE',
      emptyVideos: 'No hay episodios de docencia publicados aún',
    },
    vinculacionProject: {
      navLabel: 'Dinámicas Lingüísticas en Contextos Locales',
      heroTitle1: 'Dinámicas Lingüísticas',
      heroTitle2: 'en Contextos Locales',
      heroSubtitle: 'Proyecto de Vinculación con la Sociedad — Carrera PINE, ULEAM',
      heroDescription: 'Proyecto de vinculación con la sociedad que articula el uso del inglés y otras lenguas en contextos comunitarios y locales de Manabí.',
      integrationTitle: 'Integración con el Proyecto de Investigación',
      integrationText: 'Este proyecto comparte con el Proyecto de Innovaciones Pedagógicas e Internacionalización la producción del podcast institucional (Radio ULEAM y canal de YouTube). Los episodios agrupados aquí corresponden a productos generados desde la vinculación con la sociedad, aunque su producción técnica es conjunta con el equipo de investigación.',
      viewProjectCta: 'Ver Proyecto de Innovaciones Pedagógicas e Internacionalización',
      videosSectionTitle: 'Podcasts de Vinculación',
      videosSectionSubtitle: 'Episodios producidos como resultado de la vinculación con la sociedad de la carrera PINE',
      emptyVideos: 'No hay episodios de vinculación publicados aún',
      englishClubSectionTitle: 'Club de Inglés en Escenarios Locales',
      englishClubSectionSubtitle: 'Práctica del idioma inglés desarrollada directamente en espacios y comunidades locales',
      englishClubComingSoon: 'Se irán agregando nuevas fotos y actividades del club a medida que se desarrollen.',
      researchSectionTitle: 'Procesos de Investigación Educativa',
      researchSectionSubtitle: 'Investigación generada en el marco de la vinculación con la sociedad de la carrera PINE',
    },
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      team: 'Team',
      videos: 'Videos',
      publications: 'Publications',
      news: 'News',
      contact: 'Contact',
      docencia: 'Teaching',
      investigacion: 'Research',
      vinculacion: 'Outreach',
    },
    hero: {
      title1: 'Pedagogical Innovations',
      title2: 'and Internationalization',
      subtitle: 'Laica Eloy Alfaro University of Manabí',
      description: 'Transforming education through research, innovation and international collaboration',
      ctaProject: 'Discover the Project',
      ctaVideos: 'Watch Videos',
    },
    about: {
      sectionTitle: 'About the Project',
      sectionSubtitle: 'An innovative approach to transform education at ULEAM',
      mainTitle: 'Pedagogical Innovations Project 2025',
      p1: 'This research project focuses on the implementation and analysis of pedagogical innovations in the context of Ecuadorian higher education, with the aim of improving teaching-learning processes through innovative methodologies and the internationalization of education.',
      p2: 'Through action research, we seek to transform classroom practices, foster international collaboration and create spaces for academic dialogue that enrich the educational experience of our university community.',
      p3: 'The project includes the production of multimedia content, scientific publications, and the creation of collaboration networks with national and international institutions.',
      objectivesTitle: 'Project Objectives',
      objectives: [
        'Implement innovative pedagogical methodologies',
        'Foster the internationalization of education',
        'Generate quality scientific publications',
        'Create academic collaboration networks',
        'Produce multimedia educational content',
      ],
      highlights: [
        { title: 'Pedagogical Innovation', description: 'Development of new educational methodologies and practices that transform the teaching-learning process.' },
        { title: 'Internationalization', description: 'Collaboration with international institutions to strengthen educational quality and research.' },
        { title: 'Collaborative Research', description: 'Teamwork between teachers and students to generate knowledge and improve educational practice.' },
        { title: 'Educational Podcast', description: 'Podcast series to disseminate pedagogical experiences and foster academic dialogue.' },
      ],
    },
    team: {
      sectionTitle: 'Our Team',
    },
    publications: {
      sectionTitle: 'Scientific Publications',
      filters: { all: 'All', regional: 'Regional', libros: 'Books', impacto: 'High Impact' },
      viewBtn: 'View →',
      pdfBtn: 'PDF',
      viewAll: 'View All Publications →',
    },
    news: {
      sectionTitle: 'Latest News',
      viewAll: 'View All News →',
      readMore: 'Read more',
    },
    videos: {
      sectionTitle: 'Videos and Multimedia Content',
      filterAll: 'All',
      productionTitle: 'How is our podcast produced?',
      productionText: 'Episodes are broadcast live by Radio ULEAM on Facebook. They are then downloaded and published on our YouTube channel "PINE Investigación", which also connects with this website.',
      productionFacebookCta: 'Radio ULEAM on Facebook',
      productionYoutubeCta: 'PINE YouTube Channel',
    },
    connections: {
      sectionTitle: 'Partnerships & Support',
      sectionSubtitle: 'Networks and groups that endorse and articulate the project\'s work',
      group: {
        name: 'Research Group',
        title: 'Pedagogical innovations for sustainable development: inclusion, interculturality and interdisciplinarity',
        description: 'The PINE project operates under the endorsement of this ULEAM research group, which articulates work on educational inclusion, intercultural dialogue and interdisciplinary collaboration.',
      },
      redLea: {
        name: 'RED LEA',
        title: 'Cooperation Network for Scientific Research on Academic Reading and Writing',
        description: 'An inter-institutional network articulating research projects, joint publications and academic production on reading and writing in university contexts.',
      },
      radioUleam: {
        name: 'Radio ULEAM',
        title: 'Radio ULEAM 101.7 FM',
        description: 'Broadcasting station of the Eloy Alfaro Laica University of Manabí that broadcasts our educational podcasts live. Follow us on Facebook to access the broadcast episodes.',
        url: 'https://www.facebook.com/uleamradio101.7',
      },
    },
    hub: {
      sectionTitle: 'Bachelor\'s Degree in National and Foreign Languages Pedagogy - ULEAM',
      sectionSubtitle: 'Projects, cooperation networks and degree newsletters',
      groupName: 'Research Group',
      pineCard: {
        title: 'Pedagogical Innovations and Internationalization Project',
        description: 'Comprehensive research project on pedagogical innovations, internationalization of education and transformation of classroom practices at ULEAM.',
      },
      boletinesCard: {
        title: 'Newsletters',
        description: 'Bimonthly newsletters grouping news and activities from the degree program.',
      },
    },
    boletines: {
      pageTitle: 'Degree Newsletters',
      pageSubtitle: 'Bimonthly summary of news and activities',
      bimesterLabels: ['Jan-Feb', 'Mar-Apr', 'May-Jun', 'Jul-Aug', 'Sep-Oct', 'Nov-Dec'],
      newsBadge: 'News',
      activityBadge: 'Activity',
      noImage: 'No image',
      empty: 'No newsletters available',
      newsletters: 'Newsletters',
      bimesterPrefix: 'Newsletter',
      filterAll: 'All',
    },
    activities: {
      sectionTitle: 'Activities Gallery',
      empty: 'No activity photos yet',
    },
    contact: {
      sectionTitle: 'Contact Us',
      teamTitle: 'Contact Team',
      socialTitle: 'Social Networks',
      formTitle: 'Send us a Message',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'Your email address',
      messagePlaceholder: 'Your message...',
      sendBtn: 'Send Message',
      leader: 'Project Leader',
      coleader: 'Project Co-Leader',
    },
    footer: {
      description: 'Research project dedicated to the transformation of pedagogical practices and internationalization at the Laica Eloy Alfaro University of Manabí (ULEAM).',
      quickLinks: 'Quick Links',
      contact: 'Contact',
      rights: 'All rights reserved.',
      leader: 'Leader:',
      coleader: 'Co-Leader:',
      links: { home: 'Home', team: 'Team', videos: 'Videos', publications: 'Publications', news: 'News' },
    },
    docenciaProject: {
      navLabel: 'Innovative and Interdisciplinary Teaching',
      heroTitle1: 'Innovative Teaching',
      heroTitle2: 'and Interdisciplinary Practice',
      heroSubtitle: 'National and Foreign Languages Pedagogy Degree — ULEAM',
      heroDescription: 'Classroom practices, teaching strategies and podcast products generated directly from the PINE degree program\'s courses.',
      integrationTitle: 'Integration with the Research Project',
      integrationText: 'Episodes in this space are produced together with the Pedagogical Innovations and Internationalization Project, which manages the technical production of the institutional podcast (Radio ULEAM and YouTube channel). Products born directly from classroom teaching practice are grouped here.',
      viewProjectCta: 'View the Pedagogical Innovations and Internationalization Project',
      videosSectionTitle: 'Teaching Podcasts',
      videosSectionSubtitle: 'Episodes produced as a result of classroom practice in the PINE degree program\'s courses',
      emptyVideos: 'No teaching episodes published yet',
    },
    vinculacionProject: {
      navLabel: 'Linguistic Dynamics in Local Contexts',
      heroTitle1: 'Linguistic Dynamics',
      heroTitle2: 'in Local Contexts',
      heroSubtitle: 'Community Outreach Project — PINE Degree Program, ULEAM',
      heroDescription: 'Community outreach project articulating the use of English and other languages in local community contexts across Manabí.',
      integrationTitle: 'Integration with the Research Project',
      integrationText: 'This project shares the production of the institutional podcast (Radio ULEAM and YouTube channel) with the Pedagogical Innovations and Internationalization Project. Episodes grouped here correspond to products generated from community outreach, although their technical production is done jointly with the research team.',
      viewProjectCta: 'View the Pedagogical Innovations and Internationalization Project',
      videosSectionTitle: 'Outreach Podcasts',
      videosSectionSubtitle: 'Episodes produced as a result of the PINE degree program\'s community outreach work',
      emptyVideos: 'No outreach episodes published yet',
      englishClubSectionTitle: 'English Club in Local Settings',
      englishClubSectionSubtitle: 'English language practice carried out directly in local spaces and communities',
      englishClubComingSoon: 'New photos and club activities will be added as they take place.',
      researchSectionTitle: 'Educational Research Processes',
      researchSectionSubtitle: 'Research generated within the PINE degree program\'s community outreach work',
    },
  },
};

type Translations = typeof translations.es;

interface LanguageContextType {
  lang: Lang;
  t: Translations;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'es',
  t: translations.es,
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('es');
  const toggle = () => setLang((l) => (l === 'es' ? 'en' : 'es'));
  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
