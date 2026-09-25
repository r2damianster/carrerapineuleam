'use client';

import { useLanguage } from '@/lib/i18n';

// Encabezado de la portada: nombre de la carrera. Va antes de "Perfiles de la Carrera".
// (Los boletines ya no son una tarjeta aquí: se enlazan junto a las últimas noticias y en el pie de página.)
export default function HubProjectsSection() {
  const { t } = useLanguage();

  return (
    <section id="carrera" className="pt-10 md:pt-16 pb-2 md:pb-4 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.hub.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.hub.sectionSubtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
