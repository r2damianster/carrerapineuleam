'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center pt-24 md:pt-28 bg-gradient-to-br from-uleam-blue via-primary-800 to-uleam-blue overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Animated Shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-uleam-gold/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* Content */}
      <div className={`relative z-10 container mx-auto px-4 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Logo */}
        <div className="mb-4 md:mb-8 flex justify-center">
          <div className="relative w-36 h-36 md:w-64 md:h-64">
            <Image
              src="/images/logos/logo-proyecto.png"
              alt="Logo Proyecto Innovaciones Pedagógicas"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold text-white mb-3 md:mb-6 leading-tight">
          {t.hero.title1}
          <span className="block text-uleam-gold">{t.hero.title2}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-2xl text-gray-200 mb-2 md:mb-4 max-w-3xl mx-auto">
          {t.hero.subtitle}
        </p>
        <p className="text-base md:text-xl text-primary-200 mb-6 md:mb-12 max-w-2xl mx-auto">
          {t.hero.description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#about"
            className="px-8 py-4 bg-uleam-gold text-uleam-blue font-bold rounded-lg hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg"
          >
            {t.hero.ctaProject}
          </a>
          <a
            href="#videos"
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-lg border-2 border-white/30 hover:bg-white/20 transition-all transform hover:scale-105 backdrop-blur-sm"
          >
            {t.hero.ctaVideos}
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
