'use client';

import { useEffect, useState } from 'react';
import type { Publication } from '@/types';
import { useLanguage } from '@/lib/i18n';

const RESEARCH_PUBLICATION_ID = 'pub_3';

export default function VinculacionResearchSection() {
  const [publication, setPublication] = useState<Publication | undefined>();
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const p = t.vinculacionProject;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/publications/${RESEARCH_PUBLICATION_ID}`);
        if (res.ok) setPublication(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !publication) return null;

  return (
    <section className="py-10 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">{p.researchSectionTitle}</h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">{p.researchSectionSubtitle}</p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <span className="inline-block mb-3 px-3 py-1 bg-uleam-gold/20 text-yellow-700 text-xs font-semibold rounded-full">
              {t.publications.filters.libros}
            </span>
            <h3 className="text-lg font-bold text-uleam-blue mb-2">{publication.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{publication.abstract}</p>
            {publication.pdf_file && (
              <a
                href={publication.pdf_file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-uleam-blue text-white text-sm font-semibold rounded-lg hover:bg-uleam-blue/90 transition"
              >
                {t.publications.pdfBtn}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
