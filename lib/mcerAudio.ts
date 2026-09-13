const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO_TRANSCRIPCION = "whisper-large-v3";
const MODELO_EVALUACION = "openai/gpt-oss-120b";

export type ResultadoAudioMcer = {
  transcript: string;
  score: number;
  feedback: string;
};

/** Transcribe un audio en memoria vía Groq Whisper. El buffer nunca se guarda en disco/Cloudinary. */
async function transcribirAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("IA no configurada (GROQ_API_KEY no definida)");

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), "respuesta.webm");
  formData.append("model", MODELO_TRANSCRIPCION);
  formData.append("language", "en");

  const respuesta = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Transcripción falló: ${respuesta.status} ${detalle}`.trim());
  }

  const json = await respuesta.json();
  const texto = json?.text;
  if (typeof texto !== "string") throw new Error("Transcripción sin contenido");
  return texto.trim();
}

/** Evalúa el contenido/gramática de la transcripción contra la consigna, vía Groq (no juzga pronunciación). */
async function evaluarTranscripcion(transcript: string, consigna: string): Promise<{ score: number; feedback: string }> {
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
        {
          role: "system",
          content:
            "Eres evaluador de inglés nivel MCER. Evalúas SOLO el contenido y la gramática de una transcripción de voz a texto (no hay audio real, no juzgues pronunciación/fluidez). " +
            'Responde únicamente JSON: {"score": number (0-100), "feedback": string (máx 2 frases, en español, dirigido al estudiante)}. ' +
            "Si la transcripción está vacía, es incomprensible, o no responde la consigna, score debe ser 0.",
        },
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
  const score = Number(parsed.score);
  if (!Number.isFinite(score)) throw new Error("Evaluación con score inválido");
  return { score: Math.max(0, Math.min(100, Math.round(score))), feedback: String(parsed.feedback || "") };
}

/** Transcribe y evalúa un audio corto en un solo paso. No persiste el audio en ningún lugar. */
export async function evaluarAudioMcer(buffer: Buffer, mimeType: string, consigna: string): Promise<ResultadoAudioMcer> {
  const transcript = await transcribirAudio(buffer, mimeType);
  const { score, feedback } = await evaluarTranscripcion(transcript, consigna);
  return { transcript, score, feedback };
}
