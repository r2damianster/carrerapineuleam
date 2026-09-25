'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

interface ProyectoGestionable {
  id: string;
  nombre_oficial: string;
  rolEnProyecto: string;
}

// Panel de un proyecto. Hoy tiene una sola sección (Fotos); las siguientes entregas (texto del
// proyecto, equipo, noticias) se agregan aquí sin cambiar la ruta. Sin pestañas vacías.
export default function PanelProyectoPage() {
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
      <main className="mx-auto mt-16 max-w-3xl px-4 py-10">
        <Link href="/portal/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al Portal</Link>
        {proyecto === undefined && <p className="mt-4 text-sm text-gray-500">Cargando…</p>}
        {proyecto === null && <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">No tienes permiso para administrar este proyecto.</p>}
        {proyecto && (
          <>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">{proyecto.nombre_oficial}</h1>
            <div className="mt-6">
              <Link href={`/portal/proyecto/${proyecto.id}/fotos`} className="block rounded-lg border bg-white p-5 shadow-sm hover:border-blue-400">
                <h2 className="font-semibold text-gray-800">Fotos del proyecto</h2>
                <p className="text-sm text-gray-600">Sube fotos, elige cuáles se muestran en la página de tu proyecto y controla el máximo de cada galería.</p>
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
