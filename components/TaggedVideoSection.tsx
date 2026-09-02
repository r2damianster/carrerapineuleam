'use client';

import { useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import type { Video, VideoCategory } from '@/types';
import { useLanguage } from '@/lib/i18n';

interface TaggedVideoSectionProps {
  tag: 'docencia' | 'vinculacion';
  projectKey: 'docenciaProject' | 'vinculacionProject';
}

type ExpandedVideo = Video & { expand?: { category?: VideoCategory } };

export default function TaggedVideoSection({ tag, projectKey }: TaggedVideoSectionProps) {
  const [videos, setVideos] = useState<ExpandedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const p = t[projectKey];

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await fetch('/api/videos');
        if (!res.ok) throw new Error('Failed to fetch videos');
        const allVideos = await res.json();
        setVideos((allVideos as ExpandedVideo[]).filter((video) => video.tags?.includes(tag)));
      } catch {
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, [tag]);

  const sortedVideos = [...videos].sort(
    (a, b) => new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime()
  );
  const latestIds = new Set(sortedVideos.slice(0, 3).map((v) => v.id));

  if (loading) {
    return (
      <section className="py-10 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">{t.videos.loading}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">{p.videosSectionTitle}</h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">{p.videosSectionSubtitle}</p>
          {sortedVideos.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-uleam-gold text-uleam-blue text-base font-extrabold rounded-full shadow-md">
              🎙️ {sortedVideos.length} {t.videos.episodesPublished}
            </p>
          )}
        </div>

        {sortedVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedVideos.map((video) => (
              <VideoCard key={video.id} video={video} isLatest={latestIds.has(video.id)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-lg">{p.emptyVideos}</p>
          </div>
        )}
      </div>
    </section>
  );
}
