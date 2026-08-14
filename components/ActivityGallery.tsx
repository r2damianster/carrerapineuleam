'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getActivities } from '@/lib/db';
import type { Activity } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function ActivityGallery() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await getActivities();
        setActivities(data as any);
      } catch (error) {
        // Fallback sample data
        setActivities([
          {
            id: '1',
            title: 'Actividad Previa Podcast',
            description: 'Preparación del primer episodio del podcast educativo',
            photos: ['/images/actividad_previa_podcast.jpeg'],
            event_date: '2025-01-10',
            category: 'podcast',
            created: '',
            updated: '',
          },
          {
            id: '2',
            title: 'Grabación de Podcast',
            description: 'Sesión de grabación con invitados especiales',
            photos: ['/images/Actividad_Podcast.jpeg'],
            event_date: '2025-02-15',
            category: 'podcast',
            created: '',
            updated: '',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  if (loading) {
    return (
      <section className="py-10 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">Cargando galería...</div>
        </div>
      </section>
    );
  }

  // Flatten all photos from activities
  const allPhotos = activities.flatMap(activity => 
    activity.photos.map(photo => ({
      src: photo,
      title: activity.title,
      description: activity.description,
    }))
  );

  return (
    <section id="actividades" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.activities.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Momentos destacados de nuestras actividades y eventos
          </p>
        </div>

        {/* Photos Grid */}
        {allPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allPhotos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-lg group"
                onClick={() => setSelectedImage(photo.src)}
              >
                <Image
                  src={photo.src}
                  alt={photo.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h4 className="text-white font-bold text-sm">{photo.title}</h4>
                  {photo.description && (
                    <p className="text-gray-200 text-xs mt-1 line-clamp-2">{photo.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-lg">{t.activities.empty}</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Image
              src={selectedImage}
              alt="Activity"
              width={1200}
              height={800}
              className="object-contain max-h-screen"
            />
          </div>
        </div>
      )}
    </section>
  );
}
