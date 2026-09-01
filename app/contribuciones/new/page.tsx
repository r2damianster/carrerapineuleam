import Link from 'next/link';

const TIPOS: { tipo: string; label: string; descripcion: string }[] = [
  { tipo: 'ARTICULO_REGIONAL', label: 'Artículo regional', descripcion: 'Latindex, Dialnet u otro índice regional.' },
  { tipo: 'ARTICULO_ALTO_IMPACTO', label: 'Artículo de alto impacto', descripcion: 'Scopus, WoS, ErihPlus u otro índice de alto impacto.' },
  { tipo: 'LIBRO', label: 'Libro', descripcion: 'Libro completo publicado.' },
  { tipo: 'CAPITULO_LIBRO', label: 'Capítulo de libro', descripcion: 'Capítulo dentro de una obra colectiva.' },
  { tipo: 'MEMORIA_EVENTO', label: 'Publicación en memoria de evento', descripcion: 'Ponencia publicada en memorias de un congreso o evento.' },
  { tipo: 'PROPIEDAD_INTELECTUAL', label: 'Propiedad intelectual', descripcion: 'Obra registrada ante el organismo de propiedad intelectual.' },
];

export default function NewContributionTypePage() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Nueva contribución académica</h1>
      <p className="text-gray-600 mb-6">Selecciona el tipo de aporte que vas a registrar.</p>
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
