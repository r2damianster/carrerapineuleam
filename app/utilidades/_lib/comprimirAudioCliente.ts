'use client';

// Solo se ejecuta en el navegador (AudioContext, OfflineAudioContext, lamejs) — nunca importar desde código de servidor.

const SAMPLE_RATE_OBJETIVO = 16000; // suficiente para voz — Whisper no necesita más
const BITRATE_KBPS = 16; // mono + 16kbps: mala calidad para escuchar, suficiente para transcribir
const MUESTRAS_POR_BLOQUE = 1152; // tamaño de frame de lamejs
const MUESTRAS_ENTRE_YIELDS = MUESTRAS_POR_BLOQUE * 100; // cede el hilo cada tanto para no congelar la UI

function flotanteAInt16(muestras: Float32Array): Int16Array {
  const resultado = new Int16Array(muestras.length);
  for (let i = 0; i < muestras.length; i++) {
    const s = Math.max(-1, Math.min(1, muestras[i]));
    resultado[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return resultado;
}

/** Decodifica, baja a mono+16kHz, y re-codifica a MP3 de bitrate bajo. Todo en el navegador, no toca el servidor. */
export async function comprimirAudioParaTranscripcion(
  archivo: File,
  onProgreso?: (porcentaje: number) => void
): Promise<Blob> {
  const arrayBuffer = await archivo.arrayBuffer();
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  const contextoDecodificacion = new AudioContextCtor();
  const bufferOriginal = await contextoDecodificacion.decodeAudioData(arrayBuffer);
  await contextoDecodificacion.close();

  const largoObjetivo = Math.ceil(bufferOriginal.duration * SAMPLE_RATE_OBJETIVO);
  const contextoOffline = new OfflineAudioContext(1, largoObjetivo, SAMPLE_RATE_OBJETIVO);
  const fuente = contextoOffline.createBufferSource();
  fuente.buffer = bufferOriginal;
  fuente.connect(contextoOffline.destination);
  fuente.start();
  const bufferMono16k = await contextoOffline.startRendering();

  const muestrasInt16 = flotanteAInt16(bufferMono16k.getChannelData(0));

  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(1, SAMPLE_RATE_OBJETIVO, BITRATE_KBPS);
  const partesMp3: Uint8Array[] = [];

  for (let i = 0; i < muestrasInt16.length; i += MUESTRAS_POR_BLOQUE) {
    const bloque = muestrasInt16.subarray(i, i + MUESTRAS_POR_BLOQUE);
    const mp3buf = encoder.encodeBuffer(bloque);
    if (mp3buf.length > 0) partesMp3.push(mp3buf);

    onProgreso?.(Math.min(99, Math.round((i / muestrasInt16.length) * 100)));

    if (i % MUESTRAS_ENTRE_YIELDS === 0) {
      await new Promise(resolve => setTimeout(resolve, 0)); // cede el hilo para que la UI repinte el progreso
    }
  }
  const restante = encoder.flush();
  if (restante.length > 0) partesMp3.push(restante);
  onProgreso?.(100);

  return new Blob(partesMp3 as BlobPart[], { type: 'audio/mp3' });
}
