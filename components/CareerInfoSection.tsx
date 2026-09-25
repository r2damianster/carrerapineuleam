'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

const MALLA_PDF_URL = '/files/2026-09-25_Malla-Ajustada-PINE.pdf';
const COORDINATOR_EMAIL = 'german.carrera@uleam.edu.ec';
const SECRETARY_EMAIL = 'yasmin.bermudez@uleam.edu.ec';

type TabId = 'mision' | 'carrera' | 'malla' | 'contacto';

export default function CareerInfoSection() {
  const [activeTab, setActiveTab] = useState<TabId>('mision');
  const { t } = useLanguage();
  const info = t.careerInfo;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'mision', label: info.tabs.mision },
    { id: 'carrera', label: info.tabs.carrera },
    { id: 'malla', label: info.tabs.malla },
    { id: 'contacto', label: info.tabs.contacto },
  ];

  return (
    <section id="la-carrera" className="py-12 md:py-20 bg-gradient-to-b from-gray-50 via-white to-gray-50 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 bg-gray-200/80 rounded-2xl shadow-inner border border-gray-300/60 max-w-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm md:text-base font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-uleam-blue text-white shadow-md'
                    : 'text-gray-700 hover:text-uleam-blue hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'mision' && (
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <article className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8 border-t-4 border-t-uleam-blue">
              <h3 className="text-2xl font-bold text-uleam-blue mb-4">{info.mision.title}</h3>
              <p className="text-gray-700 leading-relaxed">{info.mision.text}</p>
            </article>
            <article className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8 border-t-4 border-t-uleam-gold">
              <h3 className="text-2xl font-bold text-uleam-blue mb-4">{info.vision.title}</h3>
              <p className="text-gray-700 leading-relaxed">{info.vision.text}</p>
            </article>
          </div>
        )}

        {activeTab === 'carrera' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8">
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {info.datasheet.map((row) => (
                  <div key={row.label}>
                    <dt className="text-xs font-bold uppercase tracking-wider text-uleam-gold">{row.label}</dt>
                    <dd className="text-gray-800 font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-uleam-blue mb-2">{info.objectiveTitle}</h3>
                <p className="text-gray-700 leading-relaxed">{info.objective}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8">
              <h3 className="text-lg font-bold text-uleam-blue mb-3">{info.admission.title}</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-5">
                {info.admission.profile.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <h4 className="font-bold text-uleam-blue mb-2">{info.admission.requirementsTitle}</h4>
              <p className="text-gray-700 leading-relaxed mb-3">{info.admission.requirementsIntro}</p>
              <blockquote className="border-l-4 border-uleam-gold bg-gray-50 p-4 rounded-r-lg text-gray-700 space-y-3 text-sm leading-relaxed">
                {info.admission.legalText.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </blockquote>
              <p className="text-gray-600 text-sm mt-3">{info.admission.loesNote}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8">
                <h3 className="text-lg font-bold text-uleam-blue mb-3">{info.graduation.title}</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-5">
                  {info.graduation.requirements.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <h4 className="font-bold text-uleam-blue mb-2">{info.graduation.modalitiesTitle}</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  {info.graduation.modalities.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8">
                <h3 className="text-lg font-bold text-uleam-blue mb-3">{info.occupational.title}</h3>
                <p className="text-gray-700 leading-relaxed">{info.occupational.text}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'malla' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-md p-8 text-center">
            <h3 className="text-2xl font-bold text-uleam-blue mb-3">{info.malla.title}</h3>
            <p className="text-gray-700 mb-6">{info.malla.text}</p>
            <a
              href={MALLA_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-uleam-blue text-white font-bold px-6 py-3 rounded-xl hover:bg-uleam-blue/90 transition-colors"
            >
              {info.malla.cta}
            </a>
          </div>
        )}

        {activeTab === 'contacto' && (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <article className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8">
              <span className="text-xs font-bold uppercase tracking-wider text-uleam-gold">{info.contact.coordinatorRole}</span>
              <h3 className="text-xl font-bold text-uleam-blue mt-1 mb-2">{info.contact.coordinatorName}</h3>
              <a href={`mailto:${COORDINATOR_EMAIL}`} className="text-uleam-blue underline break-all">{COORDINATOR_EMAIL}</a>
            </article>
            <article className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8">
              <span className="text-xs font-bold uppercase tracking-wider text-uleam-gold">{info.contact.secretaryRole}</span>
              <h3 className="text-xl font-bold text-uleam-blue mt-1 mb-2">{info.contact.secretaryName}</h3>
              <a href={`mailto:${SECRETARY_EMAIL}`} className="text-uleam-blue underline break-all">{SECRETARY_EMAIL}</a>
              <p className="text-gray-700 mt-4">
                <span className="font-semibold">{info.contact.scheduleLabel}</span> {info.contact.schedule}
              </p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
