const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/** Transcribe un audio en memoria vía Groq Whisper. El buffer nunca se guarda en disco/Cloudinary. */
export async function transcribirAudioGroq(
  buffer: Buffer,
  mimeType: string,
  opciones: { modelo?: string; idioma?: string; nombreArchivo?: string } = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("IA no configurada (GROQ_API_KEY no definida)");

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), opciones.nombreArchivo || "audio.webm");
  formData.append("model", opciones.modelo || "whisper-large-v3");
  if (opciones.idioma) formData.append("language", opciones.idioma);

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
