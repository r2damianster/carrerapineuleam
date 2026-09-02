'use client';

import { useState } from 'react';

interface VideoProps {
  video: {
    id: string;
    title: string;
    youtube_url?: string | null;
    description?: string;
    embed_id?: string | null;
    published_date?: string | null;
    category?: any;
    tags?: string[];
    expand?: { category?: { name: string; slug: string } };
  };
  isLatest?: boolean;
}

const FUNCTION_BADGES: Record<string, { label: string; className: string; icon: JSX.Element }> = {
  docencia: {
    label: 'Docencia',
    className: 'bg-uleam-blue/10 text-uleam-blue',
    icon: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 9.5L4.5 8.6 12 4.7l7.5 3.9-7.5 3.9zM5 13.18v4.32L12 21l7-3.5v-4.32l-7 3.82-7-3.82z" />
      </svg>
    ),
  },
  vinculacion: {
    label: 'Vinculación',
    className: 'bg-orange-100 text-orange-700',
    icon: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z" />
      </svg>
    ),
  },
  investigacion: {
    label: 'Investigación',
    className: 'bg-uleam-gold/20 text-yellow-700',
    icon: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1015 15.5l.27.28v.79l5 4.99L21.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z" />
      </svg>
    ),
  },
};

const CATEGORY_RING: Record<string, string> = {
  'educa-pine': 'ring-2 ring-uleam-blue',
  'voces-fuera-del-aula': 'ring-2 ring-orange-500',
  psicoeducarte: 'ring-2 ring-green-500',
};

export default function VideoCard({ video, isLatest }: VideoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryInfo = video.expand?.category ?? (typeof video.category === 'object' ? video.category : undefined);
  const isInterdisciplinary = categoryInfo?.slug === 'psicoeducarte';
  const functionTags = (video.tags ?? []).filter((tag) => FUNCTION_BADGES[tag]);
  const categoryRing = categoryInfo?.slug ? CATEGORY_RING[categoryInfo.slug] ?? '' : '';

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${categoryRing}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Embed */}
      <div className="relative aspect-video bg-gray-900">
        {isLatest && (
          <span className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2.5 py-1 bg-uleam-gold text-uleam-blue text-xs font-extrabold rounded-full shadow-md">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z" />
            </svg>
            Nuevo
          </span>
        )}
        {video.embed_id ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.embed_id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
            Próximamente
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category Badge */}
        {categoryInfo?.name && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={
                isInterdisciplinary
                  ? 'inline-block px-4 py-1.5 bg-green-600 text-white text-sm font-bold rounded-full shadow-md'
                  : 'inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full'
              }
            >
              {categoryInfo.name}
            </span>
            {isInterdisciplinary && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z" />
                </svg>
                Interdisciplinario
              </span>
            )}
          </div>
        )}

        {/* Substantive Function Badges */}
        {functionTags.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {functionTags.map((tag) => {
              const badge = FUNCTION_BADGES[tag];
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${badge.className}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-bold text-uleam-blue mb-2 line-clamp-2">
          {video.title}
        </h3>

        {/* Description */}
        {video.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Date */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {video.published_date
                ? new Date(video.published_date).toLocaleDateString('es-EC', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Fecha por confirmar'}
            </span>
          </div>

          {/* YouTube Link */}
          {video.youtube_url && (
            <a
              href={video.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
