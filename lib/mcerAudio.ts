import { transcribirAudioGroq } from "./groqAudio";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO_EVALUACION = "openai/gpt-oss-120b";

export type CriteriosRubricaAudio = {
  gramatica: number;
  vocabulario: number;
  coherencia: number;
  tarea: number;
};

export type ResultadoAudioMcer = {
  transcript: string;
  /** Suma de los 4 criterios (0-100) — este es el componente "speaking" del promedio final MCER */
  score: number;
  feedback: string;
  criterios: CriteriosRubricaAudio;
};

const RUBRICA_SISTEMA =
  "Eres evaluador de inglés hablado nivel MCER. Solo tienes la TRANSCRIPCIÓN de un audio (no el audio en sí) — nunca evalúes pronunciación/fluidez/entonación, evalúa exclusivamente el texto. " +
  "Aplica esta rúbrica de forma estricta, 4 criterios de 0 a 25 puntos cada uno:\n" +
  "1. gramatica (0-25): precisión y variedad de estructuras gramaticales usadas.\n" +
  "2. vocabulario (0-25): rango y precisión léxica, ausencia de repetición excesiva.\n" +
  "3. coherencia (0-25): organización lógica de las ideas, uso de conectores, claridad.\n" +
  "4. tarea (0-25): responde completamente la consigna con desarrollo suficiente (una sola palabra o frase incompleta no cumple la tarea).\n" +
  "Si la transcripción está vacía, es incomprensible, o no tiene relación con la consigna, los 4 criterios deben ser 0. Sé estricto: no otorgues puntaje por intención, solo por lo que el texto demuestra. " +
  'Responde ÚNICAMENTE JSON: {"gramatica": number, "vocabulario": number, "coherencia": number, "tarea": number, "feedback": string (máx 2 frases, en español, específico y constructivo para el estudiante)}.';

function clamp25(valor: number): number {
  return Math.max(0, Math.min(25, Math.round(Number.isFinite(valor) ? valor : 0)));
}

/** Evalúa la transcripción contra una rúbrica de 4 criterios (gramática/vocabulario/coherencia/tarea), vía Groq. */
async function evaluarTranscripcion(transcript: string, consigna: string): Promise<{ score: number; feedback: string; criterios: CriteriosRubricaAudio }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("IA no configurada (GROQ_API_KEY no definida)");

  const respuesta = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO_EVALUACION,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RUBRICA_SISTEMA },
        {
          role: "user",
          content: `Consigna: "${consigna}"\n\nTranscripción del estudiante: "${transcript || "(vacío)"}"`,
        },
      ],
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Evaluación falló: ${respuesta.status} ${detalle}`.trim());
  }

  const json = await respuesta.json();
  const contenido = json?.choices?.[0]?.message?.content;
  if (typeof contenido !== "string") throw new Error("Evaluación sin contenido");

  const parsed = JSON.parse(contenido);
  const criterios: CriteriosRubricaAudio = {
    gramatica: clamp25(Number(parsed.gramatica)),
    vocabulario: clamp25(Number(parsed.vocabulario)),
    coherencia: clamp25(Number(parsed.coherencia)),
    tarea: clamp25(Number(parsed.tarea)),
  };
  const score = criterios.gramatica + criterios.vocabulario + criterios.coherencia + criterios.tarea;
  return { score, feedback: String(parsed.feedback || ""), criterios };
}

/** Transcribe y evalúa un audio corto en un solo paso. No persiste el audio en ningún lugar. */
export async function evaluarAudioMcer(buffer: Buffer, mimeType: string, consigna: string): Promise<ResultadoAudioMcer> {
  const transcript = await transcribirAudioGroq(buffer, mimeType, { idioma: "en", nombreArchivo: "respuesta.webm" });
  const { score, feedback, criterios } = await evaluarTranscripcion(transcript, consigna);
  return { transcript, score, feedback, criterios };
}
