'use client';

import { useState, useEffect } from 'react';
import type { Publication } from '@/types';
import { useLanguage } from '@/lib/i18n';

type CategoryFilter = 'all' | 'regional' | 'libros' | 'impacto';

export default function PublicationsSection() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const { t, lang } = useLanguage();

  useEffect(() => {
    const loadPublications = async () => {
      try {
        const res = await fetch('/api/publications?limit=10');
        if (!res.ok) throw new Error('Failed to fetch publications');
        const data = await res.json();
        setPublications(data.publications ?? data);
      } catch (error) {
        // Fallback sample data
        setPublications([
          {
            id: '1',
            title: 'Innovaciones Pedagógicas en la Educación Superior Ecuatoriana',
            authors: 'Rodríguez, A., Villafuerte, J.',
            abstract: 'Este artículo presenta los resultados de la investigación sobre la implementación de metodologías innovadoras en el aula universitaria.',
            publication_date: '2025-03-15',
            doi_link: 'https://doi.org/10.xxxx/xxxxx',
            type: 'article',
            category: 'impacto',
            created: '',
            updated: '',
          },
          {
            id: '2',
            title: 'Internacionalización de la Educación: Experiencias desde ULEAM',
            authors: 'Villafuerte, J., Rodríguez, A.',
            abstract: 'Análisis de las estrategias de internacionalización implementadas en la Universidad Laica Eloy Alfaro de Manabí.',
            publication_date: '2025-02-10',
            doi_link: 'https://doi.org/10.xxxx/xxxxx',
            type: 'article',
            category: 'regional',
            created: '',
            updated: '',
          },
          {
            id: '3',
            title: 'Podcast Educativo: Una Herramienta de Innovación',
            authors: 'Rodríguez, A.',
            abstract: 'Exploración del uso de podcasts como herramienta pedagógica en la educación superior.',
            publication_date: '2025-01-20',
            type: 'conference',
            category: 'libros',
            created: '',
            updated: '',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadPublications();
  }, []);

  if (loading) {
    return (
      <section id="publicaciones" className="py-10 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">{t.publications.loading}</div>
        </div>
      </section>
    );
  }

  const filteredPublications = activeCategory === 'all'
    ? publications
    : publications.filter(p => p.category === activeCategory);

  const getCategoryLabel = (category: string) => {
    return t.publications.filters[category as keyof typeof t.publications.filters] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      regional: 'bg-blue-100 text-blue-700',
      libros: 'bg-green-100 text-green-700',
      impacto: 'bg-red-100 text-red-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <section id="publicaciones" className="py-10 md:py-20 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.publications.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.publications.sectionSubtitle}
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-6 md:mb-10">
          {([['all', t.publications.filters.all], ['regional', t.publications.filters.regional], ['libros', t.publications.filters.libros], ['impacto', t.publications.filters.impacto]] as [CategoryFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                activeCategory === key
                  ? 'bg-uleam-blue text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Publications with scrolling animation */}
        {filteredPublications.length > 0 ? (
          <div
            className="animate-scroll-left flex gap-5 w-fit"
            style={{ animationDuration: `${filteredPublications.length * 4}s` }}
          >
            {[...filteredPublications, ...filteredPublications].map((pub, idx) => (
              <div
                key={`${pub.id}-${idx}`}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border-l-4 border-uleam-gold w-72 flex-shrink-0"
              >
                <div className="p-5">
                {/* Category Badge */}
                <div className="mb-2">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getCategoryColor(pub.category)}`}>
                    {getCategoryLabel(pub.category)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-uleam-blue mb-2 line-clamp-2">
                  {pub.title}
                </h3>

                {/* Authors */}
                <p className="text-gray-700 font-medium text-xs mb-3 line-clamp-1">
                  {pub.authors}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {new Date(pub.publication_date).toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {pub.doi_link && (
                      <a
                        href={pub.doi_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-uleam-blue text-white text-xs font-medium rounded-lg hover:bg-uleam-blue/90 transition"
                      >
                        {t.publications.viewBtn}
                      </a>
                    )}
                    {pub.pdf_file && (
                      <a
                        href={pub.pdf_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition flex items-center gap-1"
                      >
                        {t.publications.pdfBtn}
                      </a>
                    )}
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-600 text-lg">{t.publications.empty}</p>
          </div>
        )}

        {/* View All */}
        <div className="text-center mt-6 md:mt-10">
          <a
            href="/publicaciones"
            className="inline-block px-8 py-4 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition-all transform hover:scale-105"
          >
            {t.publications.viewAll}
          </a>
        </div>
      </div>
    </section>
  );
}
