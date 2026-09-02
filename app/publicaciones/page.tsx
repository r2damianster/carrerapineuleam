'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { Publication } from '@/types';
import { useLanguage } from '@/lib/i18n';

type CategoryFilter = 'all' | 'regional' | 'libros' | 'impacto';

export default function PublicacionesPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const { t } = useLanguage();

  useEffect(() => {
    const loadPublications = async () => {
      try {
        const res = await fetch('/api/publications');
        if (!res.ok) throw new Error('Failed to fetch publications');
        setPublications(await res.json());
      } finally {
        setLoading(false);
      }
    };

    loadPublications();
  }, []);

  const filteredPublications = activeCategory === 'all'
    ? publications
    : publications.filter(p => p.category === activeCategory);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      regional: 'Regional',
      libros: 'Libros',
      impacto: 'De Impacto',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      regional: 'bg-blue-100 text-blue-700',
      libros: 'bg-green-100 text-green-700',
      impacto: 'bg-red-100 text-red-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      article: 'Artículo Científico',
      conference: 'Conferencia',
      book: 'Libro/Capítulo',
      other: 'Otro',
    };
    return types[type] || type;
  };

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen py-10 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
              {t.publications.sectionTitle}
            </h1>
            <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Investigación y producción académica del proyecto
            </p>
          </div>

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

          {loading ? (
            <div className="text-center py-12 text-2xl font-bold text-uleam-blue">
              Cargando publicaciones...
            </div>
          ) : filteredPublications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublications.map((pub) => (
                <div
                  key={pub.id}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border-l-4 border-uleam-gold"
                >
                  <div className="mb-2">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getCategoryColor(pub.category)}`}>
                      {getCategoryLabel(pub.category)}
                    </span>
                  </div>

                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                      {getTypeLabel(pub.type)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-uleam-blue mb-2">
                    {pub.title}
                  </h3>

                  <p className="text-gray-700 font-medium text-sm mb-2">
                    {pub.authors}
                  </p>

                  <p className="text-gray-600 text-sm mb-4">
                    {pub.abstract}
                  </p>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(pub.publication_date).toLocaleDateString('es-EC', {
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
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No hay publicaciones en esta categoría</p>
            </div>
          )}
        </div>
      </main>
      <Footer context="general" />
    </>
  );
}
