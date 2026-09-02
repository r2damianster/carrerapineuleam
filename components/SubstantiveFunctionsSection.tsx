'use client';

import { useState, useEffect } from 'react';
import type { Video, Publication } from '@/types';
import { useLanguage } from '@/lib/i18n';

interface NewsSlug { slug: string }

// Eventos InterClass organizados (clases que integran varias carreras/disciplinas)
const INTERCLASS_SLUGS = ['mes-de-la-magia', 'fomento-escritura-creativa'];

interface FunctionInfo {
  key: string;
  circleClass: string;
  textClass: string;
  position: string;
  icon: JSX.Element;
}

const FUNCTIONS: FunctionInfo[] = [
  {
    key: 'docencia',
    circleClass: 'bg-uleam-blue/40',
    textClass: 'text-uleam-blue',
    position: 'top-0 left-1/2 -translate-x-1/2',
    icon: (
      <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 9.5L4.5 8.6 12 4.7l7.5 3.9-7.5 3.9zM5 13.18v4.32L12 21l7-3.5v-4.32l-7 3.82-7-3.82z" />
      </svg>
    ),
  },
  {
    key: 'investigacion',
    circleClass: 'bg-uleam-gold/50',
    textClass: 'text-yellow-700',
    position: 'bottom-0 right-0',
    icon: (
      <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1015 15.5l.27.28v.79l5 4.99L21.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z" />
      </svg>
    ),
  },
  {
    key: 'vinculacion',
    circleClass: 'bg-orange-400/40',
    textClass: 'text-orange-700',
    position: 'bottom-0 left-0',
    icon: (
      <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z" />
      </svg>
    ),
  },
];

export default function SubstantiveFunctionsSection() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [news, setNews] = useState<NewsSlug[]>([]);
  const { t } = useLanguage();
  const s = t.substantiveFunctions;
  const FUNCTION_TEXT: Record<string, { title: string; caption: string }> = {
    docencia: { title: s.docenciaTitle, caption: s.docenciaCaption },
    investigacion: { title: s.investigacionTitle, caption: s.investigacionCaption },
    vinculacion: { title: s.vinculacionTitle, caption: s.vinculacionCaption },
  };

  useEffect(() => {
    fetch('/api/videos')
      .then((r) => (r.ok ? r.json() : []))
      .then((vids) => setVideos(Array.isArray(vids) ? vids : []))
      .catch(() => setVideos([]));
    fetch('/api/publications')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPublications(Array.isArray(data) ? data : []))
      .catch(() => setPublications([]));
    fetch('/api/actividades-difusion?origen=noticia')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setNews(rows.map((r: any) => ({ slug: r.slug }))))
      .catch(() => setNews([]));
  }, []);

  const interclassCount = news.filter((n) => INTERCLASS_SLUGS.includes(n.slug)).length;

  const stat = (fn: FunctionInfo): { value: number; label: string } => {
    if (fn.key === 'investigacion') {
      return { value: publications.length, label: s.statPublications };
    }
    if (fn.key === 'docencia') {
      const count = videos.filter((v) => v.tags?.includes('docencia')).length + interclassCount;
      return { value: count, label: s.statProducts };
    }
    const count = videos.filter((v) => v.tags?.includes(fn.key)).length;
    return { value: count, label: count === 1 ? s.statEpisode : s.statEpisodes };
  };

  return (
    <section id="funciones-sustantivas" className="py-10 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {s.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {s.sectionSubtitle}
          </p>
        </div>

        {/* Venn diagram */}
        <div className="relative mx-auto" style={{ width: '100%', maxWidth: '440px', aspectRatio: '1 / 1' }}>
          {FUNCTIONS.map((fn) => {
            const { value, label } = stat(fn);
            return (
              <div
                key={fn.key}
                className={`absolute ${fn.position} w-[65%] h-[65%] rounded-full ${fn.circleClass} flex flex-col items-center justify-center text-center`}
                style={{ mixBlendMode: 'multiply' }}
              >
                <span className={fn.textClass}>{fn.icon}</span>
                <span className={`text-2xl md:text-3xl font-extrabold leading-tight ${fn.textClass}`}>
                  {value}
                </span>
                <span className={`text-[11px] md:text-xs font-medium ${fn.textClass}`}>{label}</span>
                <span className={`mt-1 text-sm md:text-base font-bold ${fn.textClass}`}>{FUNCTION_TEXT[fn.key].title}</span>
              </div>
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] md:text-xs font-semibold text-gray-500 bg-white/80 px-3 py-1 rounded-full">
              {s.projectBadge}
            </span>
          </div>
        </div>

        {/* Minimal legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-10">
          {FUNCTIONS.map((fn) => (
            <div key={fn.key} className="flex items-start gap-2">
              <span className={`mt-0.5 ${fn.textClass}`}>{fn.icon}</span>
              <p className="text-sm text-gray-600">
                <span className={`font-bold ${fn.textClass}`}>{FUNCTION_TEXT[fn.key].title}: </span>
                {FUNCTION_TEXT[fn.key].caption}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
