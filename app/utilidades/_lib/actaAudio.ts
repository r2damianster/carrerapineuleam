import { transcribirAudioGroq } from "@/lib/groqAudio";
import { pedirCompletionIA, formatearErrorIA } from "./groq";

/**
 * El límite real NO es Groq (Whisper acepta hasta 25MB) — es Vercel: las
 * funciones serverless (runtime nodejs) tienen tope duro de 4.5MB de body
 * por request, plataforma, no configurable desde el código. Por eso el
 * límite queda en 4MB (margen de seguridad) y no más arriba.
 */
export const MAX_AUDIO_BYTES_ACTA = 4 * 1024 * 1024;
export const MAX_AUDIO_MB_ACTA = 4;

export type PuntosActaExtraidos = {
  transcript: string;
  aspectos: string;
  desarrollo: string;
  compromisos: string;
};

const PROMPT_EXTRACCION =
  "Eres un secretario académico. Tienes la transcripción de una reunión. Extrae fielmente (sin redactar en tono formal todavía, eso se hace después) 3 bloques:\n" +
  "1. aspectos: los puntos del orden del día mencionados, como lista breve.\n" +
  "2. desarrollo: qué se discutió/qué pasó en la reunión, resumen fiel de lo hablado.\n" +
  "3. compromisos: acuerdos, compromisos o tareas asignadas mencionados explícitamente.\n" +
  "REGLA CRÍTICA: no inventes nada que no esté en la transcripción. Si un bloque no tiene contenido claro en la transcripción, devuélvelo como cadena vacía \"\". " +
  'Responde ÚNICAMENTE JSON: {"aspectos": string, "desarrollo": string, "compromisos": string}.';

/** Transcribe (Whisper turbo — reuniones son largas, prioriza velocidad) e infiere los 3 bloques de la Acta Técnica. No persiste el audio en ningún lugar. */
export async function transcribirYExtraerPuntosActa(buffer: Buffer, mimeType: string, nombreArchivo: string): Promise<PuntosActaExtraidos> {
  const transcript = await transcribirAudioGroq(buffer, mimeType, {
    modelo: "whisper-large-v3-turbo",
    idioma: "es",
    nombreArchivo,
  });

  if (!transcript || transcript.trim().length < 5) {
    return { transcript, aspectos: "", desarrollo: "", compromisos: "" };
  }

  try {
    const respuesta = await pedirCompletionIA(
      [
        { role: "system", content: PROMPT_EXTRACCION },
        { role: "user", content: `Transcripción de la reunión:\n${transcript}` },
      ],
      { temperature: 0.2, reasoningEffort: "low", responseFormatJson: true }
    );
    const parsed = JSON.parse(respuesta);
    return {
      transcript,
      aspectos: String(parsed.aspectos || ""),
      desarrollo: String(parsed.desarrollo || ""),
      compromisos: String(parsed.compromisos || ""),
    };
  } catch (e) {
    throw new Error(`${formatearErrorIA(e)} (transcripción sí se obtuvo, pero falló la extracción de puntos)`);
  }
}
