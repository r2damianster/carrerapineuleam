'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNewsletters } from '@/lib/db';
import { useLanguage } from '@/lib/i18n';
import type { Newsletter } from '@/types';

export default function NewslettersPage() {
  const { t } = useLanguage();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const data = await getNewsletters();
        setNewsletters(data);
      } catch (error) {
        console.error('Error fetching newsletters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletters();
  }, []);

  const getBimesterLabel = (bimesterIndex: number): string => {
    return t.boletines.bimesterLabels[bimesterIndex] || '';
  };

  return (
    <>
      <Header siteName="Carrera de Pedagogía de los Idiomas Nacionales y Extranjero - ULEAM" />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
              {t.boletines.pageTitle}
            </h1>
            <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t.boletines.pageSubtitle}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Cargando boletines...</p>
            </div>
          ) : newsletters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t.boletines.empty}</p>
            </div>
          ) : (
            <div className="space-y-16">
              {newsletters.map(newsletter => (
                <section key={newsletter.id} className="border-t pt-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-uleam-blue mb-8">
                    Boletín {getBimesterLabel(newsletter.bimesterIndex)} {newsletter.year}
                  </h2>

                  {newsletter.items.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t.boletines.empty}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {newsletter.items.map(item => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          {/* Image or Placeholder */}
                          {item.image ? (
                            <div className="relative w-full h-40">
                              <Image
                                src={item.image}
                                alt={item.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                              <div className="text-center">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs text-gray-500">{t.boletines.noImage}</p>
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div className="p-4">
                            {/* Badge */}
                            <div className="mb-3">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                item.type === 'news'
                                  ? 'bg-uleam-blue/10 text-uleam-blue'
                                  : 'bg-uleam-gold/10 text-uleam-gold'
                              }`}>
                                {item.type === 'news' ? t.boletines.newsBadge : t.boletines.activityBadge}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-bold text-uleam-blue mb-2 line-clamp-2">
                              {item.title}
                            </h3>

                            {/* Date */}
                            <p className="text-sm text-gray-500 mb-3">
                              {new Date(item.date).toLocaleDateString('es-EC', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>

                            {/* Excerpt */}
                            {item.excerpt && (
                              <p className="text-sm text-gray-600 line-clamp-3">
                                {item.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
