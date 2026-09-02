'use client';

import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

export default function RedLEATestimonios() {
  const { t } = useLanguage();
  const { title, items } = t.redlea.testimonios;

  return (
    <section id="testimonios" className="w-full py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue text-center mb-16">
          {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition hover:scale-105 transform"
            >
              {/* Foto */}
              <div className="relative w-full h-48 overflow-hidden bg-gray-200">
                <Image
                  src={item.foto}
                  alt={item.nombre}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-uleam-blue mb-1">
                  {item.nombre}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{item.institucion}</p>
                <p className="text-gray-700 text-sm leading-relaxed italic">
                  "{item.texto}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
