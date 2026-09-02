'use client';

import { useEffect, useState } from 'react';
import type { Publication } from '@/types';
import { useLanguage } from '@/lib/i18n';

const RESEARCH_PUBLICATION_ID = 'pub_3';
const RESEARCH_NEWS_LEGACY_ID = 'news_10';

interface NewsItem {
  title: string;
  content: string;
}

export default function VinculacionResearchSection() {
  const [publication, setPublication] = useState<Publication | undefined>();
  const [news, setNews] = useState<NewsItem | undefined>();
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const p = t.vinculacionProject;

  useEffect(() => {
    const load = async () => {
      try {
        const [pubRes, newsRes] = await Promise.all([
          fetch(`/api/publications/${RESEARCH_PUBLICATION_ID}`),
          fetch('/api/actividades-difusion?origen=noticia'),
        ]);
        if (pubRes.ok) setPublication(await pubRes.json());
        if (newsRes.ok) {
          const rows = await newsRes.json();
          const item = rows.find((r: any) => r.legacy_id === RESEARCH_NEWS_LEGACY_ID);
          if (item) setNews({ title: item.titulo, content: item.descripcion || '' });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return null;

  return (
    <section className="py-10 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">{p.researchSectionTitle}</h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">{p.researchSectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {publication && (
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
          )}

          {news && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <span className="inline-block mb-3 px-3 py-1 bg-uleam-blue/10 text-uleam-blue text-xs font-semibold rounded-full">
                {t.news.sectionTitle}
              </span>
              <h3 className="text-lg font-bold text-uleam-blue mb-2">{news.title}</h3>
              <p className="text-gray-600 text-sm">{news.content}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
