'use client';

import { useEffect, useState } from 'react';

interface ProyectoAsignable {
  id: string;
  nombre_oficial: string;
}

interface SelectorProyectosEventoProps {
  proyectosSeleccionados: string[];
  onCambio: (proyectosSeleccionados: string[]) => void;
  /** Se avisa al formulario si no hay ningún proyecto asignable (para deshabilitar el envío). */
  onSinProyectos?: (sinProyectos: boolean) => void;
}

// WP5b — A qué proyecto(s) pertenece lo que se está registrando. La lista viene del servidor
// (GET /api/proyectos?asignables=1) y ya está limitada a lo que ESTA persona puede asignar:
// administración del sitio ve todos; un docente solo los proyectos de los que es miembro; un
// pasante tiene una regla fija (no elige, solo se muestra la etiqueta). El servidor vuelve a
// validar todo: este componente solo es comodidad de interfaz.
export default function SelectorProyectosEvento({ proyectosSeleccionados, onCambio, onSinProyectos }: SelectorProyectosEventoProps) {
  const [proyectos, setProyectos] = useState<ProyectoAsignable[]>([]);
  const [esFijo, setEsFijo] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/proyectos?asignables=1')
      .then((respuesta) => (respuesta.ok ? respuesta.json() : { fijo: false, proyectos: [] }))
      .then((datos) => {
        const lista: ProyectoAsignable[] = Array.isArray(datos?.proyectos) ? datos.proyectos : [];
        setProyectos(lista);
        setEsFijo(datos?.fijo === true);
        onSinProyectos?.(lista.length === 0);
        // Un solo proyecto (o regla fija): queda marcado automáticamente.
        if (datos?.fijo === true || lista.length === 1) onCambio(lista.map((proyecto) => proyecto.id));
      })
      .catch(() => {
        setProyectos([]);
        onSinProyectos?.(true);
      })
      .finally(() => setCargando(false));
    // Solo al montar: la lista no cambia durante el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternarProyecto = (proyectoId: string) => {
    onCambio(
      proyectosSeleccionados.includes(proyectoId)
        ? proyectosSeleccionados.filter((seleccionado) => seleccionado !== proyectoId)
        : [...proyectosSeleccionados, proyectoId]
    );
  };

  if (cargando) return <p className="text-sm text-gray-500">Cargando proyectos…</p>;

  if (proyectos.length === 0) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        No perteneces a ningún proyecto: pide a un administrador que te asigne para poder registrar eventos.
      </div>
    );
  }

  if (esFijo || proyectos.length === 1) {
    return (
      <div className="text-sm text-gray-700">
        <span className="block font-medium">Proyecto(s) al que pertenece</span>
        <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-1 text-blue-900">
          Se asociará a: {proyectos.map((proyecto) => proyecto.nombre_oficial).join(' · ')}
        </span>
      </div>
    );
  }

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700">
        ¿A qué proyecto(s) pertenece? <span className="text-red-600">*</span>
      </legend>
      <div className="mt-2 space-y-1">
        {proyectos.map((proyecto) => (
          <label key={proyecto.id} className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={proyectosSeleccionados.includes(proyecto.id)}
              onChange={() => alternarProyecto(proyecto.id)}
            />
            <span>{proyecto.nombre_oficial}</span>
          </label>
        ))}
      </div>
      {proyectosSeleccionados.length === 0 && (
        <p className="mt-1 text-xs text-red-600">Selecciona al menos un proyecto.</p>
      )}
    </fieldset>
  );
}
