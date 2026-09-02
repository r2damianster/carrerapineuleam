'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

interface ProjectIntegrationNoteProps {
  projectKey: 'docenciaProject' | 'vinculacionProject' | 'desarrolloProject' | 'mentoringProject';
}

export default function ProjectIntegrationNote({ projectKey }: ProjectIntegrationNoteProps) {
  const { t } = useLanguage();
  const p = t[projectKey];

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
