'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface ProyectoData {
  grupo_nav: string | null;
  hero_title1_es: string | null;
  hero_title1_en: string | null;
  hero_title2_es: string | null;
  hero_title2_en: string | null;
  hero_subtitle_es: string | null;
  hero_subtitle_en: string | null;
  hero_description_es: string | null;
  hero_description_en: string | null;
}

interface ProjectHeroProps {
  // Proyectos "personalizada" con texto escrito a mano en lib/i18n.tsx
  projectKey?: 'docenciaProject' | 'vinculacionProject' | 'desarrolloProject' | 'mentoringProject';
  // Proyectos "plantilla_simple" creados desde /admin/proyectos, sin i18n a mano
  data?: ProyectoData;
}

const EYEBROW_NAV_KEY = {
  docenciaProject: 'docencia',
  vinculacionProject: 'vinculacion',
  desarrolloProject: 'investigacion',
  mentoringProject: 'investigacion',
} as const;

export default function ProjectHero({ projectKey, data }: ProjectHeroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { t, lang } = useLanguage();

  const p = projectKey
    ? t[projectKey]
    : {
        heroTitle1: (lang === 'en' && data?.hero_title1_en) || data?.hero_title1_es || '',
        heroTitle2: (lang === 'en' && data?.hero_title2_en) || data?.hero_title2_es || '',
        heroSubtitle: (lang === 'en' && data?.hero_subtitle_en) || data?.hero_subtitle_es || '',
        heroDescription: (lang === 'en' && data?.hero_description_en) || data?.hero_description_es || '',
      };
  const eyebrow = projectKey ? t.nav[EYEBROW_NAV_KEY[projectKey]] : t.nav[(data?.grupo_nav as 'docencia' | 'vinculacion' | 'investigacion') || 'investigacion'];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center pt-24 md:pt-28 pb-16 bg-gradient-to-br from-uleam-blue via-primary-800 to-uleam-blue overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        ></div>
      </div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-uleam-gold/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className={`relative z-10 container mx-auto px-4 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <span className="inline-block mb-4 px-4 py-1.5 bg-uleam-gold/20 text-uleam-gold text-sm font-bold rounded-full">
          {eyebrow}
        </span>
        <h1 className="text-3xl md:text-6xl font-bold text-white mb-3 md:mb-6 leading-tight">
          {p.heroTitle1}
          <span className="block text-uleam-gold">{p.heroTitle2}</span>
        </h1>
        <p className="text-lg md:text-2xl text-gray-200 mb-2 md:mb-4 max-w-3xl mx-auto">{p.heroSubtitle}</p>
        <p className="text-base md:text-xl text-primary-200 max-w-2xl mx-auto">{p.heroDescription}</p>
      </div>
    </section>
  );
}
