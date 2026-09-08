'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

interface Foto {
  id: string;
  url: string;
  titulo?: string;
  descripcion?: string;
  posicion?: number;
}

export default function EnglishClubSection() {
  const { t } = useLanguage();
  const p = t.vinculacionProject;
  const [photos, setPhotos] = useState<Foto[]>([]);

  useEffect(() => {
    fetch('/api/photos?ubicacion=club-ingles')
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setPhotos(Array.isArray(rows) ? rows : []))
      .catch(() => setPhotos([]));
  }, []);

  return (
    <section className="py-10 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">{p.englishClubSectionTitle}</h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">{p.englishClubSectionSubtitle}</p>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {photos.map((foto) => (
              <figure key={foto.id} className="bg-gray-50 rounded-xl overflow-hidden shadow-md">
                <div className="relative aspect-video">
                  <Image
                    src={foto.url}
                    alt={foto.titulo || ''}
                    fill
                    className="object-cover"
                    style={{ objectPosition: `center ${foto.posicion ?? 50}%` }}
                  />
                </div>
                <figcaption className="p-4 text-sm text-gray-700">
                  {foto.titulo}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-8">{p.englishClubComingSoon}</p>
      </div>
    </section>
  );
}
