'use client';

import { useRef, useState } from 'react';

export type ResultadoAudioMcer = {
  transcript: string;
  score: number;
  feedback: string;
  criterios: { gramatica: number; vocabulario: number; coherencia: number; tarea: number };
};

export default function AudioQuestionRecorder({
  consigna,
  maxSeconds = 30,
  onResult,
}: {
  consigna: string;
  maxSeconds?: number;
  onResult: (resultado: ResultadoAudioMcer | null) => void;
}) {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [evaluando, setEvaluando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAudioMcer | null>(null);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const detenerTracks = (stream: MediaStream) => stream.getTracks().forEach(t => t.stop());

  const iniciarGrabacion = async () => {
    setError('');
    setResultado(null);
    onResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        detenerTracks(stream);
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await evaluar(blob, mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGrabando(true);
      setSegundos(0);

      timerRef.current = setInterval(() => {
        setSegundos(s => {
          const siguiente = s + 1;
          if (siguiente >= maxSeconds) {
            recorder.stop();
            setGrabando(false);
          }
          return siguiente;
        });
      }, 1000);
    } catch {
      setError('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
    }
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  };

  const evaluar = async (blob: Blob, mimeType: string) => {
    setEvaluando(true);
    try {
      const formData = new FormData();
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      formData.append('audio', blob, `respuesta.${extension}`);
      formData.append('consigna', consigna);

      const res = await fetch('/api/mcer/evaluar-audio', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error evaluando el audio');

      setResultado(data.data);
      onResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Error evaluando el audio');
      onResult(null);
    } finally {
      setEvaluando(false);
    }
  };

  return (
    <div className="pl-6 space-y-3">
      <div className="flex items-center gap-3">
        {!grabando ? (
          <button type="button" onClick={iniciarGrabacion} disabled={evaluando}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
            🎤 {resultado ? 'Grabar de nuevo' : 'Grabar respuesta'}
          </button>
        ) : (
          <button type="button" onClick={detenerGrabacion}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 animate-pulse">
            ⏹ Detener ({segundos}s / {maxSeconds}s)
          </button>
        )}
        {evaluando && <span className="text-sm text-gray-500">Evaluando con IA…</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {resultado && (
        <div className="p-3 bg-gray-50 border rounded-md text-sm space-y-2">
          <p className="text-gray-500 italic">Transcripción: "{resultado.transcript || '(vacío)'}"</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white border rounded p-2"><span className="block font-semibold text-gray-600">Gramática</span>{resultado.criterios.gramatica}/25</div>
            <div className="bg-white border rounded p-2"><span className="block font-semibold text-gray-600">Vocabulario</span>{resultado.criterios.vocabulario}/25</div>
            <div className="bg-white border rounded p-2"><span className="block font-semibold text-gray-600">Coherencia</span>{resultado.criterios.coherencia}/25</div>
            <div className="bg-white border rounded p-2"><span className="block font-semibold text-gray-600">Tarea</span>{resultado.criterios.tarea}/25</div>
          </div>
          <p><span className="font-semibold">Puntaje oral (cuenta al promedio final):</span> {resultado.score}/100</p>
          <p className="text-gray-700">{resultado.feedback}</p>
        </div>
      )}
      <p className="text-xs text-gray-400">Grabación máx. {maxSeconds}s — el audio no se guarda, solo el texto transcrito y su evaluación.</p>
    </div>
  );
}
