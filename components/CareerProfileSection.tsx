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
}

const MALLA_PDF = '/files/2026-09-25_Malla-Ajustada-PINE.pdf';

// Nombres propios (no son texto de interfaz, no pasan por i18n).
const DOCENTES_CARRERA = [
  'Mgtr. Bazurto Alcívar Gabriel José',
  'Mgtr. Carrera Moreno Germán Wenceslao',
  'Mgtr. Chávez Zambrano Verónica Vanessa',
  'Mgtr. Corral Joniaux Jorge Antonio',
  'Mgtr. Farfán Corrales Ulbio Gonzalo',
  'Mgtr. Intriago Palacios Eder Agustín',
  'Mgtr. López Farfán Rómulo Silvino',
  'Mgtr. Villafuerte Holguín Jhonny Saulo Alberto',
  'Mgtr. Zambrano Zambrano Cintya Maribel',
  'Mgtr. Bello Piguave Johanna Elizabeth',
  'Mgtr. Mena Sánchez Laura María',
  'Mgtr. Basantes Robalino María Cristina',
];

const CONTACTOS_CARRERA = [
  { role: 'director', name: 'Dr. Germán Carrera Moreno, PhD.', email: 'german.carrera@uleam.edu.ec' },
  { role: 'secretaria', name: 'Ing. Yasmín Bermúdez Velasco', email: 'yasmin.bermudez@uleam.edu.ec' },
];

export default function CareerProfileSection() {
  const [activeTab, setActiveTab] = useState<string>('mision');
  const [selectedCompetencia, setSelectedCompetencia] = useState<number | null>(null);
  const { t } = useLanguage();
  const cp = t.careerProfile;

  const tabs: TabConfig[] = [
    { id: 'mision', label: cp.tabs.mision },
    { id: 'descripcion', label: cp.tabs.descripcion },
    { id: 'egreso', label: cp.tabs.egreso },
    { id: 'malla', label: cp.tabs.malla },
    { id: 'docentes', label: cp.tabs.docentes },
    { id: 'contactos', label: cp.tabs.contactos },
  ];

  // Solo estilo visual de cada dominio; todo el texto (ES/EN) vive en lib/i18n.tsx → t.careerProfile.
  const estilosCompetencias: Pick<Competencia, 'colorTheme' | 'icon'>[] = [
    {
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

  const competencias: Competencia[] = cp.competencias.map((competencia, indice) => ({
    id: indice + 1,
    numero: String(indice + 1).padStart(2, '0'),
    ...competencia,
    ...estilosCompetencias[indice],
  }));

  const filteredCompetencias = selectedCompetencia
    ? competencias.filter((c) => c.id === selectedCompetencia)
    : competencias;

  return (
    <section id="perfil-egreso" className="pt-4 pb-12 md:pb-20 bg-gradient-to-b from-gray-50 via-white to-gray-50 scroll-mt-20">
      <div className="container mx-auto px-4">
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
                    {cp.egreso.summaryTitle}
                  </h3>
                  <p className="text-blue-100 text-sm md:text-base">
                    {cp.egreso.summaryText}
                  </p>
                </div>
              </div>

              {/* Contadores / Badges rápidos */}
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/15 text-xs md:text-sm whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-uleam-gold animate-pulse"></span>
                <span className="font-semibold text-white">5 {cp.egreso.keyAreas}</span>
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
                {cp.egreso.viewAll}
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
                        {cp.egreso.competencyLabel.toUpperCase()} {comp.numero}
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
                      {cp.egreso.keyFocus}
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

        {/* PESTAÑA: MISIÓN Y VISIÓN */}
        {activeTab === 'mision' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto animate-fadeIn">
            <div className="bg-white border border-blue-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-uleam-blue mb-3">{cp.mision.missionTitle}</h3>
              <div className="w-16 h-1 bg-uleam-gold rounded-full mb-4"></div>
              <p className="text-gray-700 leading-relaxed">{cp.mision.missionText}</p>
            </div>
            <div className="bg-white border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-uleam-blue mb-3">{cp.mision.visionTitle}</h3>
              <div className="w-16 h-1 bg-uleam-gold rounded-full mb-4"></div>
              <p className="text-gray-700 leading-relaxed">{cp.mision.visionText}</p>
            </div>
          </div>
        )}

        {/* PESTAÑA: DESCRIPCIÓN DE LA CARRERA */}
        {activeTab === 'descripcion' && (
          <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cp.descripcion.facts.map((fact) => (
                <div key={fact.label} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">{fact.label}</span>
                  <p className="text-uleam-blue font-semibold">{fact.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-uleam-blue to-blue-900 text-white p-6 md:p-8 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold mb-2">{cp.descripcion.objectiveTitle}</h3>
              <p className="text-blue-100 leading-relaxed">{cp.descripcion.objectiveText}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ListaDescripcion title={cp.descripcion.admissionTitle} items={cp.descripcion.admissionItems} />
              <ListaDescripcion title={cp.descripcion.requirementsTitle} intro={cp.descripcion.requirementsIntro} items={cp.descripcion.requirementsItems} />
              <ListaDescripcion title={cp.descripcion.graduationTitle} items={cp.descripcion.graduationItems} />
              <ListaDescripcion title={cp.descripcion.titulacionTitle} items={cp.descripcion.titulacionItems} />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-uleam-blue mb-2">{cp.descripcion.occupationalTitle}</h3>
              <p className="text-gray-700 leading-relaxed">{cp.descripcion.occupationalText}</p>
            </div>
          </div>
        )}

        {/* PESTAÑA: MALLA CURRICULAR */}
        {activeTab === 'malla' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-uleam-blue mb-2">{cp.malla.title}</h3>
              <p className="text-gray-600 mb-4">{cp.malla.text}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href={MALLA_PDF} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-uleam-blue text-white font-semibold rounded-xl hover:bg-blue-900 transition-colors">
                  {cp.malla.open}
                </a>
                <a href={MALLA_PDF} download className="px-5 py-2.5 bg-uleam-gold text-uleam-blue font-semibold rounded-xl hover:brightness-95 transition">
                  {cp.malla.download}
                </a>
              </div>
            </div>
            <iframe src={MALLA_PDF} title={cp.malla.title} className="hidden md:block w-full h-[700px] rounded-2xl border border-gray-200 bg-white" />
          </div>
        )}

        {/* PESTAÑA: DOCENTES */}
        {activeTab === 'docentes' && (
          <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-uleam-blue mb-2">{cp.docentes.title}</h3>
              <p className="text-gray-600">{cp.docentes.text}</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOCENTES_CARRERA.map((docente) => (
                <li key={docente} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 shadow-sm">
                  {docente}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* PESTAÑA: CONTACTOS */}
        {activeTab === 'contactos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-fadeIn">
            {CONTACTOS_CARRERA.map((contacto) => (
              <div key={contacto.email} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <span className="text-xs font-bold text-uleam-gold uppercase tracking-wider block mb-1">
                  {contacto.role === 'director' ? cp.contactos.directorRole : cp.contactos.secretaryRole}
                </span>
                <p className="text-lg font-bold text-uleam-blue mb-2">{contacto.name}</p>
                <a href={`mailto:${contacto.email}`} className="text-sm text-blue-700 hover:underline break-all">
                  {contacto.email}
                </a>
              </div>
            ))}
            <div className="bg-gradient-to-r from-uleam-blue to-blue-900 text-white rounded-2xl p-6 shadow-xl">
              <span className="text-xs font-bold text-uleam-gold uppercase tracking-wider block mb-1">{cp.contactos.scheduleTitle}</span>
              <p className="text-lg font-bold">{cp.contactos.scheduleHours}</p>
              <p className="text-blue-100">{cp.contactos.scheduleDays}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ListaDescripcion({ title, intro, items }: { title: string; intro?: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-uleam-blue mb-3">{title}</h3>
      {intro && <p className="text-sm text-gray-600 mb-3">{intro}</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-uleam-gold flex-shrink-0"></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
