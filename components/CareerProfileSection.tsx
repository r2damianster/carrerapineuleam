'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface Competencia {
  id: number;
  numero: string;
  titulo: string;
  subtitulo: string;
  badge: string;
  descripcion: string;
  puntosClave: string[];
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    ring: string;
  };
  icon: JSX.Element;
}

interface TabConfig {
  id: string;
  label: string;
  badge?: string;
  isAvailable: boolean;
}

export default function CareerProfileSection() {
  const [activeTab, setActiveTab] = useState<string>('egreso');
  const [selectedCompetencia, setSelectedCompetencia] = useState<number | null>(null);
  const { lang } = useLanguage();

  const isEs = lang === 'es';

  // Configuración de pestañas principales de la carrera (preparado a futuro)
  const tabs: TabConfig[] = [
    {
      id: 'egreso',
      label: isEs ? 'Perfil de Egreso' : 'Graduate Profile',
      isAvailable: true,
    },
    {
      id: 'profesional',
      label: isEs ? 'Perfil Profesional' : 'Professional Profile',
      badge: isEs ? 'Próximamente' : 'Coming Soon',
      isAvailable: false,
    },
    {
      id: 'ingreso',
      label: isEs ? 'Perfil de Ingreso' : 'Applicant Profile',
      badge: isEs ? 'Próximamente' : 'Coming Soon',
      isAvailable: false,
    },
  ];

  // Datos detallados del Perfil de Egreso (5 dominios / competencias)
  const competencias: Competencia[] = [
    {
      id: 1,
      numero: '01',
      titulo: isEs ? 'Conocimiento del Idioma' : 'Language Knowledge',
      subtitulo: isEs ? 'Estructura, adquisición y procesos lingüísticos' : 'Structures, acquisition, and linguistic processes',
      badge: isEs ? 'Dominio 1' : 'Domain 1',
      descripcion: isEs
        ? 'Demuestra conocimiento de las estructuras del idioma inglés, el uso del idioma inglés, la adquisición y el desarrollo de un segundo idioma y los procesos lingüísticos para ayudar a los estudiantes a adquirir el lenguaje académico y las alfabetizaciones específicas de varias áreas de contenido.'
        : 'Demonstrates knowledge of English language structures, English language use, second language acquisition and development, and language processes to assist students in acquiring academic language and content-specific literacy.',
      puntosClave: isEs
        ? ['Estructuras y sintaxis del inglés', 'Adquisición de segundo idioma (SLA)', 'Lenguaje académico especializado']
        : ['English structures & syntax', 'Second language acquisition (SLA)', 'Specialized academic language'],
      colorTheme: {
        bg: 'bg-blue-50/60 hover:bg-blue-50',
        border: 'border-blue-200 hover:border-blue-400',
        text: 'text-blue-900',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-800',
        iconBg: 'bg-blue-600 text-white',
        ring: 'ring-blue-500',
      },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 2,
      numero: '02',
      titulo: isEs ? 'Contexto Sociocultural' : 'Sociocultural Context',
      subtitulo: isEs ? 'Diversidad, equidad e inclusión educativa' : 'Diversity, equity, and educational inclusion',
      badge: isEs ? 'Dominio 2' : 'Domain 2',
      descripcion: isEs
        ? 'Demuestra y aplica el conocimiento del impacto de los contextos académicos, personales, familiares, culturales, sociales y sociopolíticos dinámicos en la educación y la adquisición del idioma inglés de los estudiantes, según lo respaldan la investigación y las teorías. Investiga las características académicas y personales de cada estudiante, así como las circunstancias familiares y las prácticas de alfabetización, para desarrollar prácticas de evaluación e instrucción efectivas e individualizadas para sus estudiantes. Reconoce cómo la identidad, el rol, la cultura y los prejuicios influyen en la interpretación de las fortalezas y necesidades de los estudiantes.'
        : 'Demonstrates and applies knowledge of the impact of dynamic academic, personal, family, cultural, social, and sociopolitical contexts on student education and English language acquisition as supported by research and theories. Investigates student characteristics and literacy practices to develop effective individualized instruction.',
      puntosClave: isEs
        ? ['Entorno multicultural y dinámico', 'Instrucción e investigación individualizada', 'Reconocimiento de identidad y diversidad']
        : ['Multicultural & dynamic context', 'Individualized research & instruction', 'Identity & diversity recognition'],
      colorTheme: {
        bg: 'bg-emerald-50/60 hover:bg-emerald-50',
        border: 'border-emerald-200 hover:border-emerald-400',
        text: 'text-emerald-900',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-800',
        iconBg: 'bg-emerald-600 text-white',
        ring: 'ring-emerald-500',
      },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 3,
      numero: '03',
      titulo: isEs ? 'Planificación y Ejecución de la Enseñanza' : 'Planning & Teaching Execution',
      subtitulo: isEs ? 'Diseño interactivo, tecnología e innovación' : 'Interactive design, technology, and innovation',
      badge: isEs ? 'Dominio 3' : 'Domain 3',
      descripcion: isEs
        ? 'Planifica entornos de apoyo para estudiantes, diseña e implementa instrucción basada en estándares utilizando enfoques interactivos basados en evidencia y centrados en los estudiantes. Toma decisiones de instrucción reflexionando sobre los resultados individuales de los estudiantes y ajustando la instrucción. Demuestra comprensión del papel de la colaboración con colegas y la comunicación con las familias para apoyar la adquisición del idioma inglés y la alfabetización de sus estudiantes en las áreas de contenido. Utiliza y adapta los recursos pertinentes, incluida la tecnología adecuada, para planificar, desarrollar, implementar y comunicar de manera efectiva la instrucción para los estudiantes.'
        : 'Plans supportive environments, designs and implements standards-based instruction using evidence-based interactive student-centered approaches. Makes instructional decisions by reflecting on individual student outcomes and using educational technology effectively.',
      puntosClave: isEs
        ? ['Instrucción basada en estándares', 'Enfoques interactivos y centrados en el estudiante', 'Integración de tecnología educativa']
        : ['Standards-based instruction', 'Interactive & student-centered approaches', 'Educational tech integration'],
      colorTheme: {
        bg: 'bg-amber-50/60 hover:bg-amber-50',
        border: 'border-amber-200 hover:border-amber-400',
        text: 'text-amber-900',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800',
        iconBg: 'bg-amber-600 text-white',
        ring: 'ring-amber-500',
      },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      id: 4,
      numero: '04',
      titulo: isEs ? 'Valoración y Evaluación' : 'Assessment & Evaluation',
      subtitulo: isEs ? 'Análisis de datos, toma de decisiones e informes' : 'Data analysis, decision-making, and reporting',
      badge: isEs ? 'Dominio 4' : 'Domain 4',
      descripcion: isEs
        ? 'Aplica los principios de evaluación para analizar e interpretar evaluaciones múltiples y variadas para los estudiantes, incluidas basadas en el aula, estandarizadas y de dominio del idioma. Entiende cómo analizar e interpretar datos para tomar decisiones informadas que promuevan el idioma inglés y el aprendizaje de contenido. Entiende la importancia de comunicar los resultados a otros educadores, estudiantes y familias de los estudiantes.'
        : 'Applies assessment principles to analyze and interpret multiple and varied evaluations for students, including classroom-based, standardized, and language proficiency assessments. Understands how to analyze and interpret data to make informed decisions that promote learning.',
      puntosClave: isEs
        ? ['Evaluaciones variadas y estandarizadas', 'Toma de decisiones basada en datos', 'Comunicación con familias y comunidad']
        : ['Varied & standardized assessments', 'Data-informed decision making', 'Communication with families & educators'],
      colorTheme: {
        bg: 'bg-purple-50/60 hover:bg-purple-50',
        border: 'border-purple-200 hover:border-purple-400',
        text: 'text-purple-900',
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-800',
        iconBg: 'bg-purple-600 text-white',
        ring: 'ring-purple-500',
      },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 5,
      numero: '05',
      titulo: isEs ? 'Profesionalismo y Liderazgo' : 'Professionalism & Leadership',
      subtitulo: isEs ? 'Ética, legislación, abogacía y docencia supervisada' : 'Ethics, legislation, advocacy, and supervised teaching',
      badge: isEs ? 'Dominio 5' : 'Domain 5',
      descripcion: isEs
        ? 'Demuestra profesionalismo y liderazgo al colaborar con otros educadores, conocer las políticas y la legislación y los derechos de los estudiantes, abogar por los estudiantes y sus familias, participar en la autoevaluación y la reflexión, buscar el desarrollo profesional continuo y perfeccionar su práctica docente a través de la enseñanza supervisada.'
        : 'Demonstrates professionalism and leadership by collaborating with educators, understanding policies, legislation, and student rights, advocating for students and their families, engaging in self-evaluation and reflection, seeking continuous professional development, and refining teaching practice.',
      puntosClave: isEs
        ? ['Colaboración docente y liderazgo', 'Derechos de estudiantes y legislación', 'Reflexión y desarrollo profesional continuo']
        : ['Teacher collaboration & leadership', 'Student rights & legislation', 'Reflective practice & continuous growth'],
      colorTheme: {
        bg: 'bg-rose-50/60 hover:bg-rose-50',
        border: 'border-rose-200 hover:border-rose-400',
        text: 'text-rose-900',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-800',
        iconBg: 'bg-rose-600 text-white',
        ring: 'ring-rose-500',
      },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
  ];

  const filteredCompetencias = selectedCompetencia
    ? competencias.filter((c) => c.id === selectedCompetencia)
    : competencias;

  return (
    <section id="perfil-egreso" className="py-12 md:py-20 bg-gradient-to-b from-gray-50 via-white to-gray-50 scroll-mt-20">
      <div className="container mx-auto px-4">
        {/* Encabezado Principal */}
        <div className="text-center mb-10 md:mb-14">
          <span className="inline-block text-xs md:text-sm font-bold tracking-wider text-uleam-gold uppercase bg-uleam-blue/10 px-4 py-1.5 rounded-full mb-3">
            {isEs ? 'Formación Académica PINE' : 'PINE Academic Training'}
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-uleam-blue mb-4 tracking-tight">
            {isEs ? 'Perfiles de la Carrera' : 'Career Profiles'}
          </h2>
          <div className="w-24 h-1.5 bg-uleam-gold mx-auto mb-5 rounded-full"></div>
          <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {isEs
              ? 'Conoce los estándares, competencias y campos de desarrollo que definen a nuestros estudiantes y graduados en Pedagogía de los Idiomas Nacionales y Extranjeros.'
              : 'Discover the standards, competencies, and development fields defining our students and graduates in Pedagogy of National and Foreign Languages.'}
          </p>
        </div>

        {/* Bar de Pestañas (Estructura extensible a futuro) */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 bg-gray-200/80 backdrop-blur-sm rounded-2xl shadow-inner border border-gray-300/60 max-w-full overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 text-sm md:text-base font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-uleam-blue text-white shadow-md shadow-uleam-blue/20 scale-[1.02]'
                      : 'text-gray-700 hover:text-uleam-blue hover:bg-white/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-uleam-gold text-uleam-blue'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PESTAÑA: PERFIL DE EGRESO */}
        {activeTab === 'egreso' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Tarjeta de Resumen / Introducción */}
            <div className="bg-gradient-to-r from-uleam-blue to-blue-900 text-white p-6 md:p-8 rounded-2xl shadow-xl border border-blue-800 flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-uleam-gold/20 backdrop-blur border border-uleam-gold/30 flex items-center justify-center text-uleam-gold flex-shrink-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                    {isEs ? '5 Dominios de Competencia Profesional' : '5 Domains of Professional Competency'}
                  </h3>
                  <p className="text-blue-100 text-sm md:text-base">
                    {isEs
                      ? 'El perfil de egreso garantiza una formación integral basada en estándares de alta calidad educativa.'
                      : 'The graduate profile guarantees comprehensive training based on high-quality educational standards.'}
                  </p>
                </div>
              </div>

              {/* Contadores / Badges rápidos */}
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/15 text-xs md:text-sm whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-uleam-gold animate-pulse"></span>
                <span className="font-semibold text-white">5 {isEs ? 'Áreas clave de egreso' : 'Key Areas'}</span>
              </div>
            </div>

            {/* Filtro rápido / Selección de competencia */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 pb-4">
              <button
                onClick={() => setSelectedCompetencia(null)}
                className={`px-3.5 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                  selectedCompetencia === null
                    ? 'bg-uleam-blue text-white shadow'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {isEs ? 'Ver Todos (5)' : 'View All (5)'}
              </button>
              {competencias.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompetencia(comp.id)}
                  className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all ${
                    selectedCompetencia === comp.id
                      ? `${comp.colorTheme.iconBg} shadow`
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {comp.numero}. {comp.titulo.split('.')[0]}
                </button>
              ))}
            </div>

            {/* Rejilla de Tarjetas de Competencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompetencias.map((comp) => (
                <div
                  key={comp.id}
                  className={`group relative bg-white border ${comp.colorTheme.border} rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1`}
                >
                  <div>
                    {/* Header de la Tarjeta */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${comp.colorTheme.iconBg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        {comp.icon}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${comp.colorTheme.badgeBg} ${comp.colorTheme.badgeText}`}>
                        {comp.badge}
                      </span>
                    </div>

                    {/* Número y Título */}
                    <div className="mb-3">
                      <span className="text-xs font-extrabold text-gray-400 tracking-wider block mb-0.5">
                        COMPETENCIA {comp.numero}
                      </span>
                      <h4 className="text-xl font-bold text-uleam-blue leading-snug group-hover:text-uleam-gold transition-colors">
                        {comp.id}. {comp.titulo}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{comp.subtitulo}</p>
                    </div>

                    {/* Descripción Principal */}
                    <p className="text-gray-700 text-sm leading-relaxed mb-5 font-normal">
                      {comp.descripcion}
                    </p>
                  </div>

                  {/* Puntos clave / Highlights */}
                  <div className="border-t border-gray-100 pt-4 mt-auto">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                      {isEs ? 'Enfoques principales:' : 'Key focus area:'}
                    </span>
                    <ul className="space-y-1.5">
                      {comp.puntosClave.map((punto, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                          <svg className="w-4 h-4 text-uleam-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{punto}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA: PERFIL PROFESIONAL (Preparado para el futuro) */}
        {activeTab === 'profesional' && (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12 text-center shadow-lg max-w-3xl mx-auto animate-fadeIn">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
              {isEs ? 'Sección en preparación' : 'Section in preparation'}
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-uleam-blue mb-4">
              {isEs ? 'Perfil Profesional y Campo Ocupacional' : 'Professional Profile & Occupational Field'}
            </h3>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-6">
              {isEs
                ? 'Esta pestaña está preparada para incluir los campos de desempeño, oportunidades laborales y roles profesionales de los egresados de la Carrera PINE ULEAM.'
                : 'This tab is prepared to feature career opportunities, performance fields, and professional roles of PINE ULEAM graduates.'}
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 max-w-md mx-auto">
              💡 {isEs ? 'Próximamente se habilitarán los detalles completos de esta sección.' : 'Full details of this section will be available soon.'}
            </div>
          </div>
        )}

        {/* PESTAÑA: PERFIL DE INGRESO (Preparado para el futuro) */}
        {activeTab === 'ingreso' && (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12 text-center shadow-lg max-w-3xl mx-auto animate-fadeIn">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
              {isEs ? 'Sección en preparación' : 'Section in preparation'}
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-uleam-blue mb-4">
              {isEs ? 'Perfil e Insumos de Ingreso' : 'Applicant Profile & Admission Requirements'}
            </h3>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-6">
              {isEs
                ? 'Esta pestaña está preparada para publicar los requisitos, aptitudes y conocimientos previos deseables para los aspirantes a la Carrera PINE.'
                : 'This tab is prepared to outline requirements, aptitudes, and prerequisite knowledge desired for PINE applicants.'}
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 max-w-md mx-auto">
              💡 {isEs ? 'Próximamente se habilitarán los detalles completos de esta sección.' : 'Full details of this section will be available soon.'}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
