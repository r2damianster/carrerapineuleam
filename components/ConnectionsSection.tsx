'use client';

import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

interface ConnectionsSectionProps {
  compact?: boolean; // versión reducida para la página principal: logos más chicos, sin texto descriptivo
}

export default function ConnectionsSection({ compact = false }: ConnectionsSectionProps) {
  const { t } = useLanguage();
  const { group, redLea, radioUleam } = t.connections;

  const cardClass = compact
    ? 'bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center hover:shadow-xl transition-all'
    : 'bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all';
  const logoClass = compact ? 'relative w-16 h-16 mb-3' : 'relative w-32 h-32 mb-5';
  const labelClass = compact
    ? 'text-xs font-semibold text-uleam-gold uppercase tracking-wide mb-1'
    : 'text-sm font-semibold text-uleam-gold uppercase tracking-wide mb-2';
  const titleClass = compact
    ? 'text-sm font-bold text-uleam-blue leading-snug'
    : 'text-lg font-bold text-uleam-blue mb-3 leading-snug';

  return (
    <section id="alianzas" className={compact ? 'py-8 md:py-12 bg-gray-50' : 'py-10 md:py-20 bg-gray-50'}>
      <div className="container mx-auto px-4">
        <div className={compact ? 'text-center mb-6 md:mb-8' : 'text-center mb-10 md:mb-14'}>
          <h2 className={compact ? 'text-2xl md:text-3xl font-bold text-uleam-blue mb-3' : 'text-4xl md:text-5xl font-bold text-uleam-blue mb-4'}>
            {t.connections.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          {!compact && (
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t.connections.sectionSubtitle}
            </p>
          )}
        </div>

        <div className={compact ? 'grid grid-cols-3 gap-4 max-w-3xl mx-auto' : 'grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'}>
          <div className={cardClass}>
            <div className={logoClass}>
              <Image
                src="/images/logos/logo-grupo-investigacion.png"
                alt={group.name}
                fill
                className="object-contain"
              />
            </div>
            <span className={labelClass}>
              {group.name}
            </span>
            <h3 className={titleClass}>
              {group.title}
            </h3>
            {!compact && <p className="text-gray-600 text-sm leading-relaxed">{group.description}</p>}
          </div>

          <a
            href="/redlea"
            className={`${cardClass} cursor-pointer hover:border-uleam-blue`}
          >
            <div className={logoClass}>
              <Image
                src="/images/logos/logo-red-lea.jpeg"
                alt={redLea.name}
                fill
                className="object-contain rounded-lg"
              />
            </div>
            <span className={labelClass}>
              {redLea.name}
            </span>
            <h3 className={titleClass}>
              {redLea.title}
            </h3>
            {!compact && <p className="text-gray-600 text-sm leading-relaxed">{redLea.description}</p>}
          </a>

          <a
            href={radioUleam.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${cardClass} cursor-pointer hover:border-uleam-blue`}
          >
            <div className={logoClass}>
              <Image
                src="/images/logos/logo-radio-uleam.png"
                alt={radioUleam.name}
                fill
                className="object-contain"
              />
            </div>
            <span className={labelClass}>
              {radioUleam.name}
            </span>
            <h3 className={titleClass}>
              {radioUleam.title}
            </h3>
            {!compact && <p className="text-gray-600 text-sm leading-relaxed">{radioUleam.description}</p>}
          </a>
        </div>
      </div>
    </section>
  );
}
