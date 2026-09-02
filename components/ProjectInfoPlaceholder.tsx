'use client';

import { useLanguage } from '@/lib/i18n';

interface ProjectInfoPlaceholderProps {
  projectKey: 'desarrolloProject' | 'mentoringProject';
}

export default function ProjectInfoPlaceholder({ projectKey }: ProjectInfoPlaceholderProps) {
  const { t } = useLanguage();
  const p = t[projectKey];

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
