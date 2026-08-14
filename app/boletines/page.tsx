'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNewsletters } from '@/lib/db';
import { useLanguage } from '@/lib/i18n';
import type { Newsletter, NewsletterItem } from '@/types';

export default function BoletinesPage() {
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
    return t.boletines.bimesterLabels[bimesterIndex] || `Bimestre ${bimesterIndex + 1}`;
  };

  const getBadgeLabel = (type: 'news' | 'activity'): string => {
    return type === 'news' ? t.boletines.newsBadge : t.boletines.activityBadge;
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
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
              {newsletters.map((newsletter) => (
                <section key={newsletter.id} className="mb-16">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-uleam-blue">
                      Boletín {getBimesterLabel(newsletter.bimesterIndex)} {newsletter.year}
                    </h2>
                    <div className="w-16 h-1 bg-uleam-gold mt-2"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {newsletter.items.map((item) => (
                      <NewsletterCard
                        key={item.id}
                        item={item}
                        getBadgeLabel={getBadgeLabel}
                        formatDate={formatDate}
                        noImageLabel={t.boletines.noImage}
                      />
                    ))}
                  </div>
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

interface NewsletterCardProps {
  item: NewsletterItem;
  getBadgeLabel: (type: 'news' | 'activity') => string;
  formatDate: (date: string) => string;
  noImageLabel: string;
}

function NewsletterCard({
  item,
  getBadgeLabel,
  formatDate,
  noImageLabel,
}: NewsletterCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image or Placeholder */}
      <div className="relative w-full aspect-video bg-gray-100 flex items-center justify-center">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">{noImageLabel}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-uleam-gold uppercase tracking-wide">
            {getBadgeLabel(item.type)}
          </span>
          <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
        </div>
        <h3 className="text-lg font-bold text-uleam-blue mb-2 line-clamp-2">
          {item.title}
        </h3>
        {item.excerpt && (
          <p className="text-sm text-gray-600 line-clamp-2">{item.excerpt}</p>
        )}
      </div>
    </div>
  );
}
