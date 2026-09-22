'use client';

import { useRef, useState } from 'react';

export type ResultadoAudioMcer = {
  transcript: string;
  score: number;
  feedback: string;
  criterios: { gramatica: number; vocabulario: number; coherencia: number; tarea: number };
};

/** Convierte un AudioBuffer recortado a Blob en formato WAV PCM de 16 bits */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  writeString('RIFF');
  setUint32(length - 8);
  writeString('WAVE');
  writeString('fmt ');
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  writeString('data');
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

/** Recorta un audio en el navegador a un máximo de maxSeconds usando Web Audio API */
async function recortarAudio(blobOrFile: Blob, maxSeconds: number = 30): Promise<{ blob: Blob; mimeType: string }> {
  try {
    const arrayBuffer = await blobOrFile.arrayBuffer();
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) {
      return { blob: blobOrFile, mimeType: blobOrFile.type || 'audio/webm' };
    }
    const audioCtx = new AudioCtxClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Si el audio dura igual o menos del límite, no hace falta recortar
    if (audioBuffer.duration <= maxSeconds) {
      audioCtx.close();
      return { blob: blobOrFile, mimeType: blobOrFile.type || 'audio/webm' };
    }

    // Si supera maxSeconds, recortar los primeros maxSeconds
    const sampleRate = audioBuffer.sampleRate;
    const targetLength = Math.min(audioBuffer.length, Math.floor(maxSeconds * sampleRate));
    const numberOfChannels = audioBuffer.numberOfChannels;

    const offlineCtx = new OfflineAudioContext(numberOfChannels, targetLength, sampleRate);
    const source = offlineCtx.createBufferSource();

    const trimmedBuffer = offlineCtx.createBuffer(numberOfChannels, targetLength, sampleRate);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      trimmedBuffer.copyToChannel(channelData.subarray(0, targetLength), channel);
    }

    source.buffer = trimmedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    audioCtx.close();

    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    return { blob: wavBlob, mimeType: 'audio/wav' };
  } catch (err) {
    console.warn('Fallback al audio original:', err);
    return { blob: blobOrFile, mimeType: blobOrFile.type || 'audio/webm' };
  }
}

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
  const [estadoTexto, setEstadoTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoAudioMcer | null>(null);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        await procesarYEvaluarAudio(blob, mimeType);
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
      setError('No se pudo acceder al micrófono. Puedes usar el botón de subir archivo de audio.');
    }
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResultado(null);
    onResult(null);
    await procesarYEvaluarAudio(file, file.type);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const procesarYEvaluarAudio = async (rawBlob: Blob, rawMime: string) => {
    setEvaluando(true);
    setEstadoTexto('Procesando y verificando duración...');
    try {
      const { blob, mimeType } = await recortarAudio(rawBlob, maxSeconds);

      setEstadoTexto('Evaluando con IA...');
      const formData = new FormData();
      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
      formData.append('audio', blob, `respuesta.${ext}`);
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
      setEstadoTexto('');
    }
  };

  return (
    <div className="pl-6 space-y-3">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
        ⏱ Tendrás máximo <strong>{maxSeconds} segundos</strong> para responder. Puedes <strong>grabar con tu micrófono</strong> o <strong>subir un archivo de audio</strong> (si tu audio dura más de {maxSeconds}s, el sistema recortará automáticamente los primeros {maxSeconds}s).
        Esta pregunta es <strong>obligatoria</strong>.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {resultado ? (
          <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-green-700 bg-green-50 border border-green-200">
            ✅ Respuesta registrada — evaluada exitosamente
          </span>
        ) : !grabando ? (
          <>
            <button
              type="button"
              onClick={iniciarGrabacion}
              disabled={evaluando}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              🎤 Grabar respuesta
            </button>
            <span className="text-xs text-gray-400">o</span>
            <label className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 cursor-pointer ${evaluando ? 'opacity-50 pointer-events-none' : ''}`}>
              📁 Subir archivo de audio
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.webm,.flac"
                onChange={handleFileUpload}
                disabled={evaluando}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <button
            type="button"
            onClick={detenerGrabacion}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 animate-pulse"
          >
            ⏹ Detener ({segundos}s / {maxSeconds}s)
          </button>
        )}

        {evaluando && <span className="text-sm text-gray-600 animate-pulse">{estadoTexto || 'Evaluando con IA...'}</span>}
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
      <p className="text-xs text-gray-400">Audio evaluado máx. {maxSeconds}s — no se guarda el archivo de audio en servidor, solo la transcripción y evaluación.</p>
    </div>
  );
}
