'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

interface ProyectoData {
  integration_text_es: string | null;
  integration_text_en: string | null;
}

interface ProjectIntegrationNoteProps {
  projectKey?: 'docenciaProject' | 'vinculacionProject' | 'desarrolloProject' | 'mentoringProject';
  data?: ProyectoData;
}

export default function ProjectIntegrationNote({ projectKey, data }: ProjectIntegrationNoteProps) {
  const { t, lang } = useLanguage();
  const p = projectKey
    ? t[projectKey]
    : {
        integrationTitle: t.proyectoGenerico.integrationTitle,
        integrationText: (lang === 'en' && data?.integration_text_en) || data?.integration_text_es || '',
        viewProjectCta: t.proyectoGenerico.viewProjectCta,
      };

  return (
    <section className="py-10 md:py-14 bg-gray-50 border-y border-gray-200">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-uleam-blue mb-4">{p.integrationTitle}</h2>
        <p className="text-gray-700 leading-relaxed mb-4">{p.integrationText}</p>
        <Link
          href="/investigacion/proyecto-innovacion"
          className="inline-block font-semibold text-uleam-blue hover:text-uleam-gold transition"
        >
          {p.viewProjectCta} →
        </Link>
      </div>
    </section>
  );
}
