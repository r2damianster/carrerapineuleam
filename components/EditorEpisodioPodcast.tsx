'use client';

import { useEffect, useMemo, useState } from 'react';
import { calcularHorasPodcast } from '@/lib/horasPodcast';

interface Episodio {
  id: string;
  titulo: string;
  youtube_url: string | null;
  participantes: number[];
  invitados_internos: string[];
  invitados_externos: string[];
  audiencia: number;
}
interface PasanteAsignable { id: number; nombres: string; apellidos: string }

interface Props {
  // Con videoId se edita ese episodio; sin él, el supervisor elige uno ya subido para asignarle horas.
  videoId?: string | null;
  onCerrar: () => void;
  onGuardado: () => void;
}

const aLineas = (lista: string[]) => lista.join('\n');
const desdeLineas = (texto: string) => texto.split('\n').map(linea => linea.trim()).filter(Boolean);

export default function EditorEpisodioPodcast({ videoId, onCerrar, onGuardado }: Props) {
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [pasantes, setPasantes] = useState<PasanteAsignable[]>([]);
  const [episodioId, setEpisodioId] = useState<string>(videoId || '');
  const [participantes, setParticipantes] = useState<number[]>([]);
  const [internos, setInternos] = useState('');
  const [externos, setExternos] = useState('');
  const [audiencia, setAudiencia] = useState('0');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const url = videoId ? `/api/vinculacion/supervisar-horas/episodio?video_id=${encodeURIComponent(videoId)}` : '/api/vinculacion/supervisar-horas/episodio';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.success) { setMensaje(data.error || 'No se pudo cargar'); return; }
        setEpisodios(data.episodios);
        setPasantes(data.pasantes);
      })
      .catch(() => setMensaje('Error de red'));
  }, [videoId]);

  const episodio = useMemo(() => episodios.find(e => e.id === episodioId) || null, [episodios, episodioId]);

  // Al elegir/cargar un episodio se precargan sus datos actuales.
  useEffect(() => {
    if (!episodio) return;
    setParticipantes(episodio.participantes);
    setInternos(aLineas(episodio.invitados_internos));
    setExternos(aLineas(episodio.invitados_externos));
    setAudiencia(String(episodio.audiencia));
  }, [episodio]);

  const desglose = useMemo(
    () => calcularHorasPodcast({
      invitadosInternosCount: desdeLineas(internos).length,
      invitadosExternosCount: desdeLineas(externos).length,
      audienciaAlcanzada: Number(audiencia) || 0,
    }),
    [internos, externos, audiencia]
  );

  const alternar = (id: number) =>
    setParticipantes(previos => (previos.includes(id) ? previos.filter(x => x !== id) : [...previos, id]));

  const guardar = async () => {
    if (!episodioId) { setMensaje('Elige un episodio.'); return; }
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/vinculacion/supervisar-horas/episodio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: episodioId,
          participantes,
          invitados_internos: desdeLineas(internos),
          invitados_externos: desdeLineas(externos),
          audiencia: Number(audiencia) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onGuardado();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">{videoId ? 'Editar episodio' : 'Asignar horas de un episodio'}</h2>
        <p className="text-sm text-gray-600 mb-4">
          Marca qué pasantes participaron y ajusta invitados y audiencia. Cada participante recibe el total de horas del episodio.
          Las horas ya aprobadas no se modifican.
        </p>

        {mensaje && <div className="p-3 mb-3 rounded bg-red-50 text-red-700 text-sm">{mensaje}</div>}

        {!videoId && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Episodio</label>
            <select value={episodioId} onChange={e => setEpisodioId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="">Elegir episodio…</option>
              {episodios.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
            </select>
          </div>
        )}
        {videoId && episodio && <p className="text-sm font-semibold text-gray-800 mb-3">{episodio.titulo}</p>}

        {episodioId && (
          <>
            <div className="mb-4">
              <span className="block text-xs font-medium text-gray-500 mb-1">Pasantes participantes</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {pasantes.length === 0 && <span className="text-sm text-gray-400">No hay pasantes asignables.</span>}
                {pasantes.map(pasante => (
                  <label key={pasante.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={participantes.includes(pasante.id)} onChange={() => alternar(pasante.id)} />
                    {pasante.nombres} {pasante.apellidos}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Invitados internos (uno por línea)</label>
                <textarea value={internos} onChange={e => setInternos(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Invitados externos (uno por línea)</label>
                <textarea value={externos} onChange={e => setExternos(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Audiencia alcanzada</label>
              <input type="number" min="0" value={audiencia} onChange={e => setAudiencia(e.target.value)} className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>

            <div className="bg-blue-50 text-blue-900 text-sm rounded-lg p-3 mb-4">
              Cada participante recibirá <strong>{desglose.horasTotal} h</strong>
              {' '}({desglose.tipoPodcast}: {desglose.horasBase} h base + {desglose.horasBonoPanelistas} h panelistas + {desglose.horasBonoAudiencia} h audiencia).
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancelar</button>
          <button onClick={guardar} disabled={guardando || !episodioId} className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
