'use client';

import { useEffect, useState } from 'react';
import type { AvanceMetasProyecto } from '@/lib/investigacionAportes';

interface Ciclo {
  id: number;
  nombre: string;
}

function BarraAvance({ porcentaje }: { porcentaje: number | null }) {
  if (porcentaje === null) return <span className="text-xs text-gray-400">sin meta numérica</span>;
  return (
    <div className="h-2 w-full rounded bg-gray-200">
      <div className="h-2 rounded bg-emerald-500" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

// Parte visual del avance (personas + actividades del plan). Reutilizada por la pantalla del líder y el Dashboard PINE.
export function PanelAvanceMetas({ avance }: { avance: AvanceMetasProyecto }) {
  const { docentes, estudiantes } = avance.personas;
  return (
    <>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[{ etiqueta: 'Docentes en el proyecto', datos: docentes }, { etiqueta: 'Estudiantes de apoyo', datos: estudiantes }].map(({ etiqueta, datos }) => (
          <div key={etiqueta} className="rounded border p-3">
            <p className="text-xs text-gray-500">{etiqueta}</p>
            <p className="text-lg font-bold text-gray-800">{datos.actual}{datos.meta ? <span className="text-sm font-normal text-gray-500"> / {datos.meta}</span> : null}</p>
            <BarraAvance porcentaje={datos.meta ? Math.min(100, Math.round((datos.actual / datos.meta) * 100)) : null} />
          </div>
        ))}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-700">Actividades del plan</h3>
      {avance.actividades.length === 0 ? (
        <p className="mt-1 text-sm text-gray-500">
          Este proyecto aún no tiene actividades con meta en este ciclo. Se definen en «Datos del proyecto para informes» y los aportes validados se contarán aquí.
        </p>
      ) : (
        <ul className="mt-2 space-y-3">
          {avance.actividades.map((actividad) => (
            <li key={actividad.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-gray-800">{actividad.actividad}</span>
                <span className="text-xs text-gray-600">
                  {actividad.avance}{actividad.meta ? ` / ${actividad.meta}` : ''} {actividad.unidad || (actividad.mide === 'horas' ? 'horas' : 'aportes')}
                  {actividad.pendiente > 0 && <span className="text-amber-600"> · {actividad.pendiente} por validar</span>}
                </span>
              </div>
              <BarraAvance porcentaje={actividad.porcentaje} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// Avance de las metas de un proyecto de Investigación en un ciclo. Todo se calcula con aportes VALIDADOS
// por el líder; los pendientes se muestran aparte. Las metas se definen en "Datos del proyecto para informes".
export default function AvanceMetasInvestigacion({ proyectoId }: { proyectoId: string }) {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [cicloId, setCicloId] = useState<number | null>(null);
  const [avance, setAvance] = useState<AvanceMetasProyecto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const parametroCiclo = cicloId ? `?ciclo_id=${cicloId}` : '';
    fetch(`/api/investigacion/proyectos/${proyectoId}/avance${parametroCiclo}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject()))
      .then((datos) => {
        setCiclos(datos.ciclos ?? []);
        setAvance(datos.avance);
        if (cicloId === null) setCicloId(datos.avance?.ciclo_id ?? null);
        setError(false);
      })
      .catch(() => setError(true));
  }, [proyectoId, cicloId]);

  if (error) return <p className="mt-4 text-sm text-red-600">No se pudo cargar el avance de metas.</p>;
  if (!avance) return <p className="mt-4 text-sm text-gray-500">Cargando avance de metas…</p>;

  return (
    <section className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-800">Avance de metas</h2>
        <select className="rounded border p-1 text-sm" value={cicloId ?? ''} onChange={(evento) => setCicloId(Number(evento.target.value))}>
          {ciclos.map((ciclo) => <option key={ciclo.id} value={ciclo.id}>Ciclo {ciclo.nombre}</option>)}
        </select>
      </div>

      <PanelAvanceMetas avance={avance} />
    </section>
  );
}

interface ProyectoConAvance {
  id: string;
  nombre_oficial: string;
  avance: AvanceMetasProyecto;
}

// Dashboard PINE: avance de metas de todos los proyectos de Investigación en el período elegido
// (o el ciclo vigente si no se eligió ninguno).
export function AvanceInvestigacionDashboard({ periodoId }: { periodoId: string }) {
  const [proyectos, setProyectos] = useState<ProyectoConAvance[] | null>(null);

  useEffect(() => {
    fetch(`/api/investigacion/avance${periodoId ? `?ciclo_id=${periodoId}` : ''}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject()))
      .then((datos) => setProyectos(datos.proyectos ?? []))
      .catch(() => setProyectos([]));
  }, [periodoId]);

  if (proyectos === null) return <p className="text-sm text-gray-500">Cargando metas de Investigación…</p>;
  if (proyectos.length === 0) return <p className="text-sm text-gray-500">No hay proyectos de investigación para mostrar.</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {proyectos.map((proyecto) => (
        <section key={proyecto.id} className="rounded-xl border-t-4 border-emerald-500 bg-white p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">{proyecto.nombre_oficial}</h3>
          <PanelAvanceMetas avance={proyecto.avance} />
        </section>
      ))}
    </div>
  );
}
