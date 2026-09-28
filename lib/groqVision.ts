// lib/groqVision.ts
// Auditoría IA de la foto de evidencia de asistencia (punto 5) — herramienta de APOYO,
// nunca restrictiva: jamás bloquea el guardado ni lanza. Reusa GROQ_API_KEY (ya configurada
// para /utilidades, ver app/utilidades/_lib/groq.ts) y su mismo manejo de 429/cuota agotada.
//
// ⚠️ El id de modelo de visión de Groq puede cambiar con el tiempo — verificar contra la
// cuenta/documentación de Groq si este modelo deja de responder.

import { formatearErrorIA } from '@/app/utilidades/_lib/groq';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TOLERANCIA_PERSONAS = 1;

export interface ResultadoAuditoriaFoto {
  estado: 'ok' | 'discrepancia' | 'no_disponible';
  conteoDetectado: number | null;
}

// Nunca lanza — cualquier fallo (incluida cuota agotada) degrada a 'no_disponible'
// sin interrumpir el flujo de quien está registrando la asistencia.
export async function auditarFotoAsistencia(fotoUrl: string, conteoEsperado: number): Promise<ResultadoAuditoriaFoto> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { estado: 'no_disponible', conteoDetectado: null };

  try {
    const respuesta = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO_VISION,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Cuenta cuántas personas aparecen en esta foto. Responde únicamente con el número, sin texto adicional.' },
            { type: 'image_url', image_url: { url: fotoUrl } },
          ],
        }],
      }),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      throw new Error(`${respuesta.status} ${detalle}`.trim());
    }
    const json = await respuesta.json();
    const contenido = json?.choices?.[0]?.message?.content ?? '';
    const conteoDetectado = parseInt(String(contenido).match(/\d+/)?.[0] ?? '', 10);
    if (isNaN(conteoDetectado)) return { estado: 'no_disponible', conteoDetectado: null };

    const discrepancia = Math.abs(conteoDetectado - conteoEsperado) > TOLERANCIA_PERSONAS;
    return { estado: discrepancia ? 'discrepancia' : 'ok', conteoDetectado };
  } catch (error) {
    console.error('Auditoría IA de foto de asistencia no disponible:', formatearErrorIA(error));
    return { estado: 'no_disponible', conteoDetectado: null };
  }
}
