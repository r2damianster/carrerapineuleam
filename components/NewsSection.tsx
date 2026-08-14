'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getNews } from '@/lib/db';
import type { News } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function NewsSection() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await getNews();
        setNews(data as any);
      } catch (error) {
        // Fallback sample data
        setNews([
          {
            id: '1',
            title: 'Nuevo episodio de podcast: Innovación en la era digital',
            content: 'Hemos lanzado nuestro más reciente episodio donde exploramos las tendencias de innovación educativa...',
            featured_image: '/images/activities/Actividad_Podcast.jpeg',
            published_date: '2025-03-20',
            is_featured: true,
            slug: 'episodio-innovacion-era-digital',
            created: '',
            updated: '',
          },
          {
            id: '2',
            title: 'Publicación en revista internacional',
            content: 'Nuestro equipo ha publicado un artículo en una revista indexada sobre internacionalización educativa...',
            published_date: '2025-03-10',
            is_featured: false,
            slug: 'publicacion-revista-internacional',
            created: '',
            updated: '',
          },
          {
            id: '3',
            title: 'Taller de innovaciones pedagógicas',
            content: 'Realizamos exitosamente el taller con la participación de más de 50 docentes de diferentes facultades...',
            featured_image: '/images/activities/actividad_previa_podcast.jpeg',
            published_date: '2025-02-28',
            is_featured: false,
            slug: 'taller-innovaciones-pedagogicas',
            created: '',
            updated: '',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  if (loading) {
    return (
      <section id="noticias" className="py-10 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">Cargando noticias...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="noticias" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.news.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Mantente al día con las novedades del proyecto
          </p>
        </div>

        {/* News Horizontal Scroll */}
        <div className="flex overflow-x-auto space-x-8 pb-4">
          {news.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-80">
              <NewsCard news={item} />
            </div>
          ))}
        </div>

        {news.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-gray-600 text-lg">No hay noticias aún</p>
          </div>
        )}
      </div>
    </section>
  );
}

function NewsCard({ news }: { news: News }) {
  const { t } = useLanguage();
  return (
    <article className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100">
      {/* Featured Image */}
      {news.featured_image && (
        <div className="relative h-48 bg-gray-200">
          <Image
            src={news.featured_image}
            alt={news.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <time>
            {new Date(news.published_date).toLocaleDateString('es-EC', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-uleam-blue mb-3 line-clamp-2">
          {news.title}
        </h3>

        {/* Content Preview */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {news.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
        </p>

        {/* Read More */}
        {news.external_link && (
          <a
            href={news.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1 transition"
          >
            {t.news.readMore}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
    </article>
  );
}
