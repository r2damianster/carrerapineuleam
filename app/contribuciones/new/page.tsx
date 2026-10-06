'use client';

import { useState } from 'react';
import Link from 'next/link';
import EnlaceContribucionModal from '@/components/EnlaceContribucionModal';

const TIPOS: { tipo: string; label: string; descripcion: string }[] = [
  { tipo: 'ARTICULO_REGIONAL', label: 'Artículo regional', descripcion: 'Latindex, Dialnet u otro índice regional.' },
  { tipo: 'ARTICULO_ALTO_IMPACTO', label: 'Artículo de alto impacto', descripcion: 'Scopus, WoS, ErihPlus u otro índice de alto impacto.' },
  { tipo: 'LIBRO', label: 'Libro', descripcion: 'Libro completo publicado.' },
  { tipo: 'CAPITULO_LIBRO', label: 'Capítulo de libro', descripcion: 'Capítulo dentro de una obra colectiva.' },
  { tipo: 'MEMORIA_EVENTO', label: 'Publicación en memoria de evento', descripcion: 'Ponencia publicada en memorias de un congreso o evento.' },
  { tipo: 'PROPIEDAD_INTELECTUAL', label: 'Propiedad intelectual', descripcion: 'Obra registrada ante el organismo de propiedad intelectual.' },
];

export default function NewContributionTypePage() {
  const [mostrarModalEnlace, setMostrarModalEnlace] = useState(false);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
          &larr; Volver al Portal PINE
        </Link>
        <Link href="/contribuciones" className="text-sm text-blue-600 hover:underline">
          Ver contribuciones registradas
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Nueva contribución académica</h1>
      <p className="text-gray-600 mb-4">Selecciona el tipo de aporte que vas a registrar.</p>

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900 mb-2">
          ¿Un estudiante o colaborador va a registrar la contribución por ti? Genera un enlace/QR, elige el tipo y,
          si quieres, tu número de autoría. Lo que envíen queda pendiente hasta que lo apruebes.
        </p>
        <button
          onClick={() => setMostrarModalEnlace(true)}
          className="px-3 py-2 bg-uleam-blue text-white rounded font-semibold hover:bg-uleam-blue/90"
        >
          🔗 Recibir contribución por enlace/QR
        </button>
      </div>
      {mostrarModalEnlace && <EnlaceContribucionModal onClose={() => setMostrarModalEnlace(false)} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TIPOS.map(({ tipo, label, descripcion }) => (
          <Link
            key={tipo}
            href={`/contribuciones/new/${tipo}`}
            className="block border rounded-lg p-4 hover:shadow-md hover:border-uleam-blue transition"
          >
            <h2 className="font-semibold text-uleam-blue">{label}</h2>
            <p className="text-sm text-gray-600 mt-1">{descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
