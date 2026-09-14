'use client';

import { useEffect, useState } from 'react';

interface Estudiante {
  id: number;
  nombres: string;
  apellidos: string;
}

interface SelectorParticipantesPodcastProps {
  areaSustantiva: string;
  participantes: number[];
  invitadosInternos: string[];
  invitadosExternos: string[];
  onParticipantesChange: (ids: number[]) => void;
  onInvitadosInternosChange: (nombres: string[]) => void;
  onInvitadosExternosChange: (nombres: string[]) => void;
}

// Quiénes hicieron el podcast (pasantes de la lista) + invitados sueltos
// (interno = alguien de la universidad que no es pasante de vinculación,
// externo = de afuera) — de acá se deriva automáticamente el tipo de
// episodio y las horas acreditables (lib/horasPodcast.ts), solo cuando el
// área es 'vinculacion' (ver ## Cambios Recientes Sesión 38).
export default function SelectorParticipantesPodcast({
  areaSustantiva,
  participantes,
  invitadosInternos,
  invitadosExternos,
  onParticipantesChange,
  onInvitadosInternosChange,
  onInvitadosExternosChange,
}: SelectorParticipantesPodcastProps) {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [nuevoInterno, setNuevoInterno] = useState('');
  const [nuevoExterno, setNuevoExterno] = useState('');

  useEffect(() => {
    fetch('/api/estudiantes-lista')
      .then((res) => (res.ok ? res.json() : { estudiantes: [] }))
      .then((data) => setEstudiantes(data.estudiantes || []))
      .catch(() => setEstudiantes([]));
  }, []);

  const toggleParticipante = (id: number) => {
    onParticipantesChange(participantes.includes(id) ? participantes.filter((p) => p !== id) : [...participantes, id]);
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
    <div className="pt-4 border-t space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pasantes que participaron en el podcast</label>
        <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
          {estudiantes.length === 0 && <p className="text-sm text-gray-400">Cargando pasantes...</p>}
          {estudiantes.map((e) => (
            <label key={e.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={participantes.includes(e.id)} onChange={() => toggleParticipante(e.id)} />
              {e.nombres} {e.apellidos}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">Marca a todos los pasantes que aparecieron en este episodio, no solo quien lo registra.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invitados internos (universidad)</label>
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
                <li key={i} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                  {nombre}
                  <button type="button" onClick={() => onInvitadosInternosChange(invitadosInternos.filter((_, idx) => idx !== i))} className="text-red-600 hover:underline text-xs">Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invitados externos</label>
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
                <li key={i} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                  {nombre}
                  <button type="button" onClick={() => onInvitadosExternosChange(invitadosExternos.filter((_, idx) => idx !== i))} className="text-red-600 hover:underline text-xs">Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {areaSustantiva === 'vinculacion' && (
        <p className="text-xs text-indigo-600">Las horas acreditables de este episodio se calculan automáticamente según quién participó y la audiencia reportada, y quedan pendientes hasta que el video se apruebe en el sitio.</p>
      )}
    </div>
  );
}
