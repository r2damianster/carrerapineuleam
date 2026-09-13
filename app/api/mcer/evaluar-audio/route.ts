import { NextResponse } from 'next/server';
import { evaluarAudioMcer } from '@/lib/mcerAudio';

// Público a propósito (mismo criterio que /api/enlaces/[token]/pretest — se usa
// tanto desde el flujo con sesión como desde el enlace público sin login).
// El audio llega en memoria y se descarta al terminar esta función — nunca se
// sube a Cloudinary ni se escribe a disco, solo se guarda transcript+score.
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // ~40s de audio comprimido, sobra para un clip de 30s

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const consigna = formData.get('consigna');

    if (!audio) {
      return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 });
    }
    if (!audio.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'El archivo no es audio' }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'El audio supera el límite permitido' }, { status: 400 });
    }
    if (typeof consigna !== 'string' || !consigna.trim()) {
      return NextResponse.json({ error: 'Falta la consigna de la pregunta' }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const resultado = await evaluarAudioMcer(buffer, audio.type, consigna);

    return NextResponse.json({ success: true, data: resultado });
  } catch (error: any) {
    console.error('Evaluación de audio MCER error:', error);
    return NextResponse.json(
      { error: 'No se pudo evaluar el audio', details: error.message },
      { status: 500 }
    );
  }
}
