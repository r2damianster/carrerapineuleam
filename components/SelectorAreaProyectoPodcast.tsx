'use client';

import { useEffect, useState } from 'react';

interface Proyecto {
  id: string;
  nombre_oficial: string;
  grupo_nav: string;
}

interface SelectorAreaProyectoPodcastProps {
  area: string;
  proyectoId: string;
  onAreaChange: (area: string) => void;
  onProyectoChange: (proyectoId: string) => void;
}

const AREAS = [
  { value: 'docencia', label: 'Docencia' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'vinculacion', label: 'Vinculación' },
];

// Área (docencia/investigación/vinculación) + proyecto específico de esa área
// — usa la tabla `proyectos` real (grupo_nav agrupa por área, Sesión 32/38).
// Si el área elegida solo tiene un proyecto, se autoselecciona sin mostrar
// dropdown (decisión del usuario, Sesión 38) — si en el futuro se agrega otro
// proyecto a esa área, el dropdown aparece solo, sin tocar este componente.
export default function SelectorAreaProyectoPodcast({ area, proyectoId, onAreaChange, onProyectoChange }: SelectorAreaProyectoPodcastProps) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);

  useEffect(() => {
    fetch('/api/proyectos?all=true')
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: any[]) => setProyectos(Array.isArray(rows) ? rows : []))
      .catch(() => setProyectos([]));
  }, []);

  const proyectosDelArea = proyectos.filter((p) => p.grupo_nav === area);

  useEffect(() => {
    if (proyectosDelArea.length === 1 && proyectoId !== proyectosDelArea[0].id) {
      onProyectoChange(proyectosDelArea[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, proyectosDelArea.length]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Área del podcast</label>
        <select
          value={area}
          onChange={(e) => { onAreaChange(e.target.value); onProyectoChange(''); }}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border"
        >
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      {proyectosDelArea.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Proyecto</label>
          <select
            value={proyectoId}
            onChange={(e) => onProyectoChange(e.target.value)}
            className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border"
          >
            <option value="">Selecciona un proyecto...</option>
            {proyectosDelArea.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_oficial}</option>
            ))}
          </select>
        </div>
      )}
      {proyectosDelArea.length === 1 && (
        <div className="flex items-end pb-2">
          <p className="text-sm text-gray-500">Proyecto: <span className="font-medium text-gray-700">{proyectosDelArea[0].nombre_oficial}</span></p>
        </div>
      )}
      <p className="md:col-span-2 text-xs text-gray-500">Además del proyecto elegido, este podcast se suma automáticamente al proyecto Innovaciones Pedagógicas e Internacionalización.</p>
    </div>
  );
}
