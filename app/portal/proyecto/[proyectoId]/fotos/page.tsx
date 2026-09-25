'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import BancoFotos from '@/components/fotos/BancoFotos';

interface ProyectoGestionable {
  id: string;
  nombre_oficial: string;
}

// Banco de fotos de UN proyecto para su líder/colíder. Solo muestra fotos etiquetadas a ese proyecto
// y solo permite publicar en las galerías de ese proyecto; la portada y los demás proyectos no
// aparecen. La barrera real está en las APIs (consultan proyecto_miembros en cada petición).
export default function FotosProyectoPage() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const [proyecto, setProyecto] = useState<ProyectoGestionable | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/photos/ubicaciones')
      .then((respuesta) => (respuesta.ok ? respuesta.json() : { proyectos: [] }))
      .then((datos) => {
        const lista: ProyectoGestionable[] = Array.isArray(datos.proyectos) ? datos.proyectos : [];
        setProyecto(lista.find((item) => item.id === proyectoId) ?? null);
      })
      .catch(() => setProyecto(null));
  }, [proyectoId]);

  return (
    <>
      <Header />
      <main className="mx-auto mt-16 max-w-6xl px-4 py-10">
        <Link href={`/portal/proyecto/${proyectoId}`} className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al proyecto</Link>
        {proyecto === undefined && <p className="mt-4 text-sm text-gray-500">Cargando…</p>}
        {proyecto === null && <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">No tienes permiso para administrar este proyecto.</p>}
        {proyecto && (
          <>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">Fotos — {proyecto.nombre_oficial}</h1>
            <div className="mt-6">
              <BancoFotos modo="lider" proyectoId={proyecto.id} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
