'use client';

import { useEffect, useState } from 'react';

interface Estudiante {
  id: number;
  nombres: string;
  apellidos: string;
}

interface Profesor {
  id: number;
  nombres: string;
  apellidos: string;
}

interface SelectorParticipantesPodcastProps {
  areaSustantiva: string;
  profesoresResponsables?: number[];
  participantes: number[];
  invitadosInternos: string[];
  invitadosExternos: string[];
  onParticipantesChange: (ids: number[]) => void;
  onInvitadosInternosChange: (nombres: string[]) => void;
  onInvitadosExternosChange: (nombres: string[]) => void;
}

export default function SelectorParticipantesPodcast({
  areaSustantiva,
  profesoresResponsables = [],
  participantes,
  invitadosInternos,
  invitadosExternos,
  onParticipantesChange,
  onInvitadosInternosChange,
  onInvitadosExternosChange,
}: SelectorParticipantesPodcastProps) {
  const [pasantesTodos, setPasantesTodos] = useState<Estudiante[]>([]);
  const [pasantesTitulares, setPasantesTitulares] = useState<Estudiante[]>([]);
  const [profesoresTodos, setProfesoresTodos] = useState<Profesor[]>([]);

  const [pasanteInvitadoSeleccion, setPasanteInvitadoSeleccion] = useState('');
  const [docenteSeleccion, setDocenteSeleccion] = useState('');
  const [nuevoInterno, setNuevoInterno] = useState('');
  const [nuevoExterno, setNuevoExterno] = useState('');

  // 1. Cargar todos los estudiantes de vinculación
  useEffect(() => {
    fetch('/api/estudiantes-lista')
      .then((res) => (res.ok ? res.json() : { estudiantes: [] }))
      .then((data) => setPasantesTodos(data.estudiantes || []))
      .catch(() => setPasantesTodos([]));

    fetch('/api/profesores')
      .then((res) => (res.ok ? res.json() : { profesores: [] }))
      .then((data) => setProfesoresTodos(data.profesores || []))
      .catch(() => setProfesoresTodos([]));
  }, []);

  // 2. Cargar pasantes titulares asignados a los profesores responsables elegidos
  useEffect(() => {
    const ids = profesoresResponsables.filter(Boolean);
    const url = ids.length > 0
      ? `/api/espacios/instructores?profesor_ids=${ids.join(',')}`
      : `/api/espacios/instructores?espacio_id=9`; // Espacio Podcast por defecto

    fetch(url)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => {
        const titulares = Array.isArray(data.data) ? data.data : [];
        setPasantesTitulares(titulares);
      })
      .catch(() => setPasantesTitulares([]));
  }, [profesoresResponsables]);

  const toggleParticipante = (id: number) => {
    onParticipantesChange(participantes.includes(id) ? participantes.filter((p) => p !== id) : [...participantes, id]);
  };

  // Pasantes invitados: todos los estudiantes que NO son titulares de este espacio y no han sido agregados aún
  const pasantesInvitables = pasantesTodos.filter(
    (p) => !pasantesTitulares.some((t) => t.id === p.id) && !participantes.includes(p.id)
  );

  // Pasantes invitados que ya fueron agregados (para mostrarlos en su sección separada)
  const pasantesInvitadosAgregados = pasantesTodos.filter(
    (p) => !pasantesTitulares.some((t) => t.id === p.id) && participantes.includes(p.id)
  );

  // Docentes participantes disponibles (excluye los marcados como responsables principales)
  const docentesInvitables = profesoresTodos.filter(
    (p) => !profesoresResponsables.includes(p.id)
  );

  const agregarPasanteInvitado = () => {
    if (!pasanteInvitadoSeleccion) return;
    const id = parseInt(pasanteInvitadoSeleccion, 10);
    if (!isNaN(id) && !participantes.includes(id)) {
      onParticipantesChange([...participantes, id]);
    }
    setPasanteInvitadoSeleccion('');
  };

  const agregarDocenteParticipante = () => {
    if (!docenteSeleccion) return;
    const docente = profesoresTodos.find((p) => p.id === parseInt(docenteSeleccion, 10));
    if (docente) {
      const etiqueta = `${docente.nombres} ${docente.apellidos} (Docente)`;
      if (!invitadosInternos.includes(etiqueta)) {
        onInvitadosInternosChange([...invitadosInternos, etiqueta]);
      }
    }
    setDocenteSeleccion('');
  };

  const agregarInterno = () => {
    if (!nuevoInterno.trim()) return;
    onInvitadosInternosChange([...invitadosInternos, nuevoInterno.trim()]);
    setNuevoInterno('');
  };

  const agregarExterno = () => {
    if (!nuevoExterno.trim()) return;
    onInvitadosExternosChange([...invitadosExternos, nuevoExterno.trim()]);
    setNuevoExterno('');
  };

  return (
    <div className="pt-4 border-t space-y-5">
      {/* SECCIÓN 1: Pasantes Titulares del Supervisor/Espacio */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1">
          Pasantes Asignados / Titulares
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Estudiantes asignados al docente responsable seleccionado (ej. Michell y Kayla con el supervisor Arturo).
        </p>
        <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto space-y-1 bg-gray-50">
          {pasantesTitulares.length === 0 ? (
            <p className="text-sm text-gray-400">No hay pasantes titulares registrados para este supervisor.</p>
          ) : (
            pasantesTitulares.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={participantes.includes(e.id)}
                  onChange={() => toggleParticipante(e.id)}
                />
                <span className="font-medium">{e.nombres} {e.apellidos}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* SECCIÓN 2: Pasantes Invitados (Paridad con Asistencia) */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 space-y-2">
        <label className="block text-sm font-semibold text-indigo-900">
          Pasantes Invitados (Otros Estudiantes de Vinculación)
        </label>
        <div className="flex gap-2">
          <select
            value={pasanteInvitadoSeleccion}
            onChange={(e) => setPasanteInvitadoSeleccion(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border text-sm"
          >
            <option value="">-- Seleccionar pasante invitado --</option>
            {pasantesInvitables.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombres} {p.apellidos}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={agregarPasanteInvitado}
            disabled={!pasanteInvitadoSeleccion}
            className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            + Agregar invitado
          </button>
        </div>

        {pasantesInvitadosAgregados.length > 0 && (
          <ul className="mt-2 space-y-1">
            {pasantesInvitadosAgregados.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm bg-white border border-indigo-100 px-3 py-1.5 rounded-md shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">Invitado</span>
                  <span>{p.nombres} {p.apellidos}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleParticipante(p.id)}
                  className="text-red-600 hover:underline text-xs font-medium"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SECCIÓN 3: Docentes / Profesores Participantes */}
      <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-3 space-y-2">
        <label className="block text-sm font-semibold text-purple-900">
          Docentes / Profesores Participantes (Opcional)
        </label>
        <div className="flex gap-2">
          <select
            value={docenteSeleccion}
            onChange={(e) => setDocenteSeleccion(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border text-sm"
          >
            <option value="">-- Seleccionar docente participante --</option>
            {docentesInvitables.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombres} {p.apellidos}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={agregarDocenteParticipante}
            disabled={!docenteSeleccion}
            className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            + Agregar docente
          </button>
        </div>
      </div>

      {/* SECCIÓN 4: Invitados Internos / Externos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invitados internos (universidad / autoridades)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoInterno}
              onChange={(e) => setNuevoInterno(e.target.value)}
              placeholder="Nombre del invitado"
              className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border text-sm"
            />
            <button type="button" onClick={agregarInterno} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">Agregar</button>
          </div>
          {invitadosInternos.length > 0 && (
            <ul className="mt-2 space-y-1">
              {invitadosInternos.map((nombre, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1.5 rounded border">
                  <span>{nombre}</span>
                  <button type="button" onClick={() => onInvitadosInternosChange(invitadosInternos.filter((_, idx) => idx !== i))} className="text-red-600 hover:underline text-xs">Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invitados externos (fuera de la ULEAM)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoExterno}
              onChange={(e) => setNuevoExterno(e.target.value)}
              placeholder="Nombre del invitado"
              className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border text-sm"
            />
            <button type="button" onClick={agregarExterno} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">Agregar</button>
          </div>
          {invitadosExternos.length > 0 && (
            <ul className="mt-2 space-y-1">
              {invitadosExternos.map((nombre, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1.5 rounded border">
                  <span>{nombre}</span>
                  <button type="button" onClick={() => onInvitadosExternosChange(invitadosExternos.filter((_, idx) => idx !== i))} className="text-red-600 hover:underline text-xs">Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-indigo-600">
        Los pasantes marcados (titulares o invitados) reciben horas acreditables de Vinculación por este episodio, calculadas según su participación y la audiencia reportada — quedan pendientes de aprobación en el sitio.
      </p>
    </div>
  );
}
