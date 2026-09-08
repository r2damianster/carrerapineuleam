'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

interface Foto {
  id: string;
  url: string;
  titulo?: string;
  posicion?: number;
}

export default function RedLEAGaleria() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Foto[]>([]);
  const { t } = useLanguage();
  const { title, subtitle } = t.redlea.galeria;

  useEffect(() => {
    fetch('/api/photos?ubicacion=redlea-galeria')
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setPhotos(Array.isArray(rows) ? rows : []))
      .catch(() => setPhotos([]));
  }, []);

  if (photos.length === 0) return null;

  return (
    <section id="galeria" className="w-full py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue text-center mb-4">
          {title}
        </h2>
        <p className="text-center text-gray-600 text-lg mb-12">
          {subtitle}
        </p>

        {/* Grid de fotos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {photos.map((foto, idx) => (
            <div
              key={foto.id}
              className="relative h-48 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setSelectedIdx(idx)}
            >
              <Image
                src={foto.url}
                alt={foto.titulo || ''}
                fill
                className="object-cover group-hover:scale-110 transition duration-300"
                style={{ objectPosition: `center ${foto.posicion ?? 50}%` }}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition" />
            </div>
          ))}
        </div>

        {/* Modal de imagen ampliada */}
        {selectedIdx !== null && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedIdx(null)}
          >
            <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <Image
                src={photos[selectedIdx].url}
                alt={photos[selectedIdx].titulo || ''}
                width={1200}
                height={800}
                className="w-full h-auto rounded-lg"
              />
              <button
                onClick={() => setSelectedIdx(null)}
                className="absolute top-4 right-4 bg-uleam-blue text-white p-2 rounded-full hover:bg-blue-700 transition"
              >
                ✕
              </button>
              <p className="text-white text-center mt-4">{photos[selectedIdx].titulo}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
