'use client';

import { useState, useEffect } from 'react';
import VideoCard from './VideoCard';
import type { VideoCategory, Video } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function VideoGallery() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const { t } = useLanguage();

  const PAGE_SIZE = 6;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catsRes, vidsRes] = await Promise.all([
          fetch('/api/video-categories?active=true'),
          fetch('/api/videos'),
        ]);
        if (!catsRes.ok || !vidsRes.ok) throw new Error('Failed to fetch videos');
        setCategories(await catsRes.json());
        setVideos(await vidsRes.json());
      } catch (error) {
        // Fallback sample data
        setCategories([
          { id: '1', name: 'Todos', slug: 'all', order: 0, is_active: true, created: '', updated: '' },
          { id: '2', name: 'Podcast - Innovación Pedagógica', slug: 'podcast-innovacion', order: 1, is_active: true, created: '', updated: '' },
          { id: '3', name: 'Podcast - Internacionalización', slug: 'podcast-internacionalizacion', order: 2, is_active: true, created: '', updated: '' },
          { id: '4', name: 'Entrevistas', slug: 'entrevistas', order: 3, is_active: true, created: '', updated: '' },
        ]);
        
        setVideos([
          {
            id: '1',
            title: 'Episodio 1: Innovación en el Aula',
            youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'Primer episodio sobre innovaciones pedagógicas',
            embed_id: 'dQw4w9WgXcQ',
            category: '2',
            published_date: '2025-01-15',
            order: 1,
            is_featured: true,
            created: '',
            updated: '',
          },
          {
            id: '2',
            title: 'Episodio 2: Internacionalización',
            youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'La importancia de la internacionalización en ULEAM',
            embed_id: 'dQw4w9WgXcQ',
            category: '3',
            published_date: '2025-02-01',
            order: 2,
            is_featured: true,
            created: '',
            updated: '',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const sortedVideos = [...videos].sort(
    (a, b) => new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime()
  );
  const latestIds = new Set(sortedVideos.slice(0, 3).map((v) => v.id));

  const filteredVideos = selectedCategory === 'all'
    ? sortedVideos
    : sortedVideos.filter(v => v.category === selectedCategory);

  const visibleVideos = filteredVideos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVideos.length;

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setVisibleCount(PAGE_SIZE);
  };

  if (loading) {
    return (
      <section id="videos" className="py-10 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">Cargando videos...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="videos" className="py-10 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.videos.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Explora nuestra colección de podcasts, entrevistas y materiales educativos
          </p>
          {videos.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-uleam-gold text-uleam-blue text-base font-extrabold rounded-full shadow-md">
              🎙️ {videos.length} episodios publicados
            </p>
          )}
        </div>

        {/* Podcast Production Info */}
        <div className="mb-8 md:mb-12 px-4 py-6 md:py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start max-w-4xl mx-auto">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img
                src="/images/logos/logo-radio-uleam.png"
                alt="Radio ULEAM"
                className="h-20 w-20 md:h-24 md:w-24 object-contain"
              />
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-bold text-uleam-blue mb-3">
                {t.videos.productionTitle}
              </h3>
              <p className="text-base text-gray-700 mb-4 leading-relaxed">
                {t.videos.productionText}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a
                  href="https://www.facebook.com/uleamradio101.7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
                >
                  f {t.videos.productionFacebookCta}
                </a>
                <a
                  href="https://www.youtube.com/@PINEInvestigacion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 transition-all"
                >
                  ▶ {t.videos.productionYoutubeCta}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-6 md:mb-10">
            <button
              onClick={() => handleSelectCategory('all')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-uleam-blue text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.videos.filterAll}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-uleam-blue text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Videos Grid */}
        {filteredVideos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleVideos.map((video) => (
                <VideoCard key={video.id} video={video} isLatest={latestIds.has(video.id)} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-8 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition-all"
                >
                  Cargar más episodios
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-lg">No hay videos en esta categoría aún</p>
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-6 md:mt-10">
          <a
            href="https://www.youtube.com/@PINEInvestigacion"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition-all transform hover:scale-105"
          >
            Ver Canal de PINE en YouTube →
          </a>
        </div>
      </div>
    </section>
  );
}
