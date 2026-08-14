'use client';

import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

export default function ConnectionsSection() {
  const { t } = useLanguage();
  const { group, redLea, radioUleam } = t.connections;

  return (
    <section id="alianzas" className="py-10 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.connections.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.connections.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all">
            <div className="relative w-32 h-32 mb-5">
              <Image
                src="/images/logos/logo-grupo-investigacion.png"
                alt={group.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-uleam-gold uppercase tracking-wide mb-2">
              {group.name}
            </span>
            <h3 className="text-lg font-bold text-uleam-blue mb-3 leading-snug">
              {group.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">{group.description}</p>
          </div>

          <a
            href="/redlea"
            className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all cursor-pointer hover:border-uleam-blue"
          >
            <div className="relative w-32 h-32 mb-5">
              <Image
                src="/images/logos/logo-red-lea.jpeg"
                alt={redLea.name}
                fill
                className="object-contain rounded-lg"
              />
            </div>
            <span className="text-sm font-semibold text-uleam-gold uppercase tracking-wide mb-2">
              {redLea.name}
            </span>
            <h3 className="text-lg font-bold text-uleam-blue mb-3 leading-snug">
              {redLea.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">{redLea.description}</p>
          </a>

          <a
            href={radioUleam.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all cursor-pointer hover:border-uleam-blue"
          >
            <div className="relative w-32 h-32 mb-5">
              <Image
                src="/images/logos/logo-radio-uleam.png"
                alt={radioUleam.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-uleam-gold uppercase tracking-wide mb-2">
              {radioUleam.name}
            </span>
            <h3 className="text-lg font-bold text-uleam-blue mb-3 leading-snug">
              {radioUleam.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">{radioUleam.description}</p>
          </a>
        </div>
      </div>
    </section>
  );
}
