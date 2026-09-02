'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsletterSidebar from '@/components/NewsletterSidebar';
import NewsletterViewer from '@/components/NewsletterViewer';
import NewsletterFilter from '@/components/NewsletterFilter';
import { getNewsletters } from '@/lib/db';
import { useLanguage } from '@/lib/i18n';
import type { Newsletter } from '@/types';

type FilterType = 'all' | 'news' | 'activity';

export default function NewslettersPage() {
  const { t } = useLanguage();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNewsletterId, setActiveNewsletterId] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const data = await getNewsletters();
        setNewsletters(data);
        if (data.length > 0) {
          setActiveNewsletterId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching newsletters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletters();
  }, []);

  const activeNewsletter = newsletters.find(n => n.id === activeNewsletterId);

  return (
    <>
      <Header siteName="Carrera de Pedagogía de los Idiomas Nacionales y Extranjero - ULEAM" />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
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
            <div className="flex flex-col md:flex-row gap-8">
              {/* Sidebar */}
              <NewsletterSidebar
                newsletters={newsletters}
                activeNewsletterId={activeNewsletterId}
                onSelectNewsletter={setActiveNewsletterId}
              />

              {/* Main Content */}
              <div className="flex-1">
                {activeNewsletter && (
                  <div>
                    {/* Filters */}
                    <div className="mb-8">
                      <NewsletterFilter
                        activeFilter={filter}
                        onFilterChange={setFilter}
                      />
                    </div>

                    {/* Newsletter Viewer */}
                    <NewsletterViewer
                      newsletter={activeNewsletter}
                      filter={filter}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer context="general" />
    </>
  );
}
