'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function HubProjectsSection() {
  const { t } = useLanguage();
  const { pineCard } = t.hub;
  const { redLea } = t.connections;

  return (
    <section id="proyectos" className="py-10 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.hub.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.hub.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link
            href="/pine"
            className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all hover:border-uleam-blue"
          >
            <div className="relative w-32 h-32 mb-5 bg-gradient-to-br from-uleam-blue/10 to-uleam-gold/10 rounded-lg flex items-center justify-center">
              <span className="text-4xl font-bold text-uleam-blue">PINE</span>
            </div>
            <span className="text-sm font-semibold text-uleam-gold uppercase tracking-wide mb-2">
              {t.hub.groupName}
            </span>
            <h3 className="text-lg font-bold text-uleam-blue mb-3 leading-snug">
              {pineCard.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">{pineCard.description}</p>
          </Link>

          <Link
            href="/redlea"
            className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all hover:border-uleam-blue"
          >
            <div className="relative w-32 h-32 mb-5">
              <Image
                src="/images/logo-red-lea.jpeg"
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
          </Link>
        </div>
      </div>
    </section>
  );
}
