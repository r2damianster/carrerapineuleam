'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface ProyectoGestionable {
  id: string;
  nombre_oficial: string;
  rolEnProyecto: string;
}

// Lista los proyectos que la persona puede administrar (líder/colíder; administración del sitio ve todos).
// Si solo hay uno, entra directo. La autorización real la hacen las APIs, no esta pantalla.
export default function MisProyectosPage() {
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoGestionable[] | null>(null);

  useEffect(() => {
    fetch('/api/photos/ubicaciones')
      .then((respuesta) => (respuesta.ok ? respuesta.json() : { proyectos: [] }))
      .then((datos) => {
        const lista: ProyectoGestionable[] = Array.isArray(datos.proyectos) ? datos.proyectos : [];
        if (lista.length === 1) router.replace(`/portal/proyecto/${lista[0].id}`);
        else setProyectos(lista);
      })
      .catch(() => setProyectos([]));
  }, [router]);

  return (
    <>
      <Header />
      <main className="mx-auto mt-16 max-w-3xl px-4 py-10">
        <Link href="/portal/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al Portal</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Administrar mi proyecto</h1>
        {proyectos === null && <p className="mt-4 text-sm text-gray-500">Cargando…</p>}
        {proyectos !== null && proyectos.length === 0 && (
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            No eres líder ni colíder de ningún proyecto. Si crees que es un error, pide a un administrador que te asigne en el equipo del proyecto.
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {(proyectos ?? []).map((proyecto) => (
            <li key={proyecto.id}>
              <Link href={`/portal/proyecto/${proyecto.id}`} className="block rounded-lg border bg-white p-4 shadow-sm hover:border-blue-400">
                <span className="font-semibold text-gray-800">{proyecto.nombre_oficial}</span>
                <span className="ml-2 text-xs text-gray-500">({proyecto.rolEnProyecto === 'admin_sitio' ? 'administración' : proyecto.rolEnProyecto})</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
