'use client';

import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

const fotos = [
  '/images/redlea/05-memoria/02-imagen.jpeg',
  '/images/redlea/05-memoria/03-imagen.jpeg',
  '/images/redlea/05-memoria/04-imagen.jpeg',
  '/images/redlea/05-memoria/10-imagen.jpeg',
  '/images/redlea/05-memoria/11-imagen.jpeg',
  '/images/redlea/05-memoria/12-imagen.jpeg',
];

export default function RedLEAMemoria() {
  const { t } = useLanguage();
  const m = t.redlea.memoria;

  return (
    <section id="memoria" className="w-full py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue text-center mb-4">
          {m.title}
        </h2>
        <p className="text-center text-gray-600 text-lg mb-12">
          {m.subtitle1}
          <br />
          <span className="font-semibold">{m.subtitle2}</span>
        </p>

        {/* Resumen */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-4">{m.presentationTitle}</h3>
          <div className="prose max-w-none text-gray-700 space-y-4">
            <p dangerouslySetInnerHTML={{ __html: m.presentation1 }} />
            <p dangerouslySetInnerHTML={{ __html: m.presentation2 }} />
            <p>{m.presentation3}</p>
          </div>
        </div>

        {/* Objetivo */}
        <div className="bg-blue-50 border-l-4 border-uleam-gold p-8 mb-12 rounded-r-lg">
          <h3 className="text-2xl font-bold text-uleam-blue mb-4">{m.objectiveTitle}</h3>
          <p className="text-lg text-gray-700">
            {m.objectiveText}
          </p>
        </div>

        {/* Universidades participantes */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">{m.universitiesTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {m.universities.map((uni, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <p className="text-gray-700">{uni}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Logros */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">{m.achievementsTitle}</h3>
          <ul className="space-y-3">
            {m.achievements.map((logro, idx) => (
              <li key={idx} className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <span className="text-green-600 font-bold mr-4">✓</span>
                <span className="text-gray-700">{logro}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Proyecciones 2026 */}
        <div className="bg-yellow-50 p-8 rounded-lg border border-uleam-gold mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">{m.projectionsTitle}</h3>
          <ul className="space-y-2 text-gray-700">
            {m.projections.map((reto, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-uleam-blue font-bold mr-3">→</span>
                <span>{reto}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Galería Memoria */}
        <div>
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">{m.photosTitle}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fotos.map((foto, idx) => (
              <div
                key={idx}
                className="relative h-40 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition"
              >
                <Image
                  src={foto}
                  alt={`${m.photosTitle} ${idx + 1}`}
                  fill
                  className="object-cover hover:scale-110 transition duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
