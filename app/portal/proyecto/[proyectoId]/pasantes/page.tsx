'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

interface Pasante {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
}

interface Actividad {
  id: number;
  usuario_id: number;
  nombres: string;
  apellidos: string;
  fecha: string;
  descripcion: string;
  horas: number | string;
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
}

const ETIQUETA_ESTADO: Record<Actividad['estado_aprobacion'], string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobada',
  rechazado: 'Rechazada',
};

// Vista de solo lectura para el líder/colíder: pasantes que aportan a su proyecto de
// investigación y sus actividades reportadas. La aprobación de horas sigue siendo del supervisor.
export default function PasantesProyectoPage() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const [pasantes, setPasantes] = useState<Pasante[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'sin-permiso' | 'listo'>('cargando');

  useEffect(() => {
    fetch(`/api/proyectos/${proyectoId}/pasantes`)
      .then(async (respuesta) => {
        if (!respuesta.ok) {
          setEstado('sin-permiso');
          return;
        }
        const datos = await respuesta.json();
        setPasantes(datos.pasantes ?? []);
        setActividades(datos.actividades ?? []);
        setEstado('listo');
      })
      .catch(() => setEstado('sin-permiso'));
  }, [proyectoId]);

  const horasDelPasante = (pasanteId: number, estadoAprobacion: Actividad['estado_aprobacion']) =>
    actividades
      .filter((actividad) => actividad.usuario_id === pasanteId && actividad.estado_aprobacion === estadoAprobacion)
      .reduce((total, actividad) => total + Number(actividad.horas), 0);

  return (
    <>
      <Header />
      <main className="mx-auto mt-16 max-w-3xl px-4 py-10">
        <Link href={`/portal/proyecto/${proyectoId}`} className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al proyecto</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Aporta desde Vinculación</h1>
        <p className="text-sm text-gray-600">Pasantes que aportan a este proyecto y las actividades que reportan. Las horas las aprueba su supervisor.</p>

        {estado === 'cargando' && <p className="mt-4 text-sm text-gray-500">Cargando…</p>}
        {estado === 'sin-permiso' && <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">No tienes permiso para ver este proyecto.</p>}

        {estado === 'listo' && (
          <>
            {pasantes.length === 0 && <p className="mt-6 text-sm text-gray-500">Todavía no hay pasantes asignados a este proyecto.</p>}
            <ul className="mt-6 space-y-3">
              {pasantes.map((pasante) => {
                const actividadesDelPasante = actividades.filter((actividad) => actividad.usuario_id === pasante.id);
                return (
                  <li key={pasante.id} className="rounded-lg border bg-white p-4 shadow-sm">
                    <p className="font-semibold text-gray-800">{pasante.nombres} {pasante.apellidos}</p>
                    <p className="text-xs text-gray-500">{pasante.email}</p>
                    <p className="mt-1 text-sm text-gray-700">
                      Horas aprobadas: <strong>{horasDelPasante(pasante.id, 'aprobado')}</strong>
                      {' · '}Pendientes: {horasDelPasante(pasante.id, 'pendiente')}
                    </p>
                    {actividadesDelPasante.length === 0 ? (
                      <p className="mt-2 text-xs text-gray-400">Sin actividades reportadas.</p>
                    ) : (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-blue-600">Ver {actividadesDelPasante.length} actividad(es)</summary>
                        <ul className="mt-2 space-y-2">
                          {actividadesDelPasante.map((actividad) => (
                            <li key={actividad.id} className="rounded bg-gray-50 p-2 text-sm">
                              <p className="text-xs text-gray-500">
                                {new Date(actividad.fecha).toLocaleDateString('es-EC')} · {Number(actividad.horas)} h · {ETIQUETA_ESTADO[actividad.estado_aprobacion]}
                              </p>
                              <p className="text-gray-700">{actividad.descripcion}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
