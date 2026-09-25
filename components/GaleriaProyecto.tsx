'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

interface Foto {
  id: string;
  url: string;
  titulo?: string | null;
  descripcion?: string | null;
  posicion?: number;
}

type ClaveGaleria = 'internacionalizacion' | 'desarrolloHabilidades' | 'mentoring' | 'generic';

interface GaleriaProyectoProps {
  /** Slug de fotos_ubicaciones (ej. 'internacionalizacion-galeria'). */
  ubicacion: string;
  /** Qué título/subtítulo traducido usar (lib/i18n.tsx → t.projectGalleries). */
  claveTexto?: ClaveGaleria;
}

// Galería de un proyecto: lee las fotos publicadas en SU ubicación (el servidor ya aplica el tope
// suave y el filtro de menores/fuente aprobada). Si no hay fotos, no muestra nada (ni título vacío).
export default function GaleriaProyecto({ ubicacion, claveTexto = 'generic' }: GaleriaProyectoProps) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetch(`/api/photos?ubicacion=${encodeURIComponent(ubicacion)}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : []))
      .then((filas) => setFotos(Array.isArray(filas) ? filas : []))
      .catch(() => setFotos([]));
  }, [ubicacion]);

  if (fotos.length === 0) return null;

  const textos = t.projectGalleries[claveTexto];

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center md:mb-12">
          <h2 className="mb-4 text-3xl font-bold text-uleam-blue md:text-4xl">{textos.title}</h2>
          <div className="mx-auto mb-6 h-1 w-24 bg-uleam-gold"></div>
          <p className="mx-auto max-w-3xl text-lg text-gray-600">{textos.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {fotos.map((foto) => (
            <button
              key={foto.id}
              type="button"
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
              onClick={() => setFotoAmpliada(foto.url)}
            >
              <Image
                src={foto.url}
                alt={foto.titulo || t.projectGalleries.lightboxAlt}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                style={{ objectPosition: `center ${foto.posicion ?? 50}%` }}
              />
            </button>
          ))}
        </div>
      </div>

      {fotoAmpliada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setFotoAmpliada(null)}>
          <Image
            src={fotoAmpliada}
            alt={t.projectGalleries.lightboxAlt}
            width={1200}
            height={800}
            className="max-h-screen object-contain"
          />
        </div>
      )}
    </section>
  );
}
