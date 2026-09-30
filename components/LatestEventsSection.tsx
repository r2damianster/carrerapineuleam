'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

const LATEST_EVENTS_LIMIT = 6;

interface LatestEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  isPodcast: boolean;
  photoUrl?: string;
}

export default function LatestEventsSection() {
  const [events, setEvents] = useState<LatestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch(`/api/actividades-difusion?seccion=eventos&limite=${LATEST_EVENTS_LIMIT}`);
        if (!res.ok) throw new Error('Failed to fetch events');
        const rows = await res.json();
        setEvents(
          rows.map((row: any) => ({
            id: String(row.id),
            title: row.titulo,
            description: row.descripcion || '',
            date: row.fecha,
            isPodcast: row.tipo === 'podcast',
            photoUrl: row.photos?.[0],
          }))
        );
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  if (loading) {
    return (
      <section id="eventos" className="py-10 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">{t.latestEvents.loading}</div>
        </div>
      </section>
    );
  }

  // Sin eventos publicados no se muestra la sección vacía en la portada.
  if (events.length === 0) return null;

  return (
    <section id="eventos" className="py-10 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">{t.latestEvents.sectionTitle}</h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">{t.latestEvents.sectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100"
            >
              {event.photoUrl ? (
                <div className="relative h-48 bg-gray-200">
                  <Image src={event.photoUrl} alt={event.title} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-uleam-blue to-uleam-blue/70 flex items-center justify-center text-6xl">
                  {event.isPodcast ? '🎙️' : '📅'}
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="px-3 py-1 bg-uleam-gold text-uleam-blue text-xs font-bold rounded-full">
                    {event.isPodcast ? t.latestEvents.podcastBadge : t.latestEvents.eventBadge}
                  </span>
                  <time>
                    {new Date(event.date).toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <h3 className="text-lg font-bold text-uleam-blue mb-3 line-clamp-2">{event.title}</h3>
                {event.description && (
                  <p className="text-gray-600 text-sm line-clamp-3">{event.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
