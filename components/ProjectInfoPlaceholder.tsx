'use client';

import { useLanguage } from '@/lib/i18n';

interface ProyectoData {
  nombre_oficial: string;
  info_text_es: string | null;
  info_text_en: string | null;
}

interface ProjectInfoPlaceholderProps {
  projectKey?: 'desarrolloProject' | 'mentoringProject';
  data?: ProyectoData;
}

export default function ProjectInfoPlaceholder({ projectKey, data }: ProjectInfoPlaceholderProps) {
  const { t, lang } = useLanguage();
  const p = projectKey
    ? t[projectKey]
    : {
        infoTitle: data?.nombre_oficial || '',
        infoText: (lang === 'en' && data?.info_text_en) || data?.info_text_es || '',
      };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-uleam-blue mb-4">{p.infoTitle}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {p.infoText}
        </p>
      </div>
    </section>
  );
}
