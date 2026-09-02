import { pedirCompletionIA, formatearErrorIA } from "./groq";

const CAMPOS_MEMO = [
  "numero_memo", "fecha_memo", "facultad", "carrera",
  "opcion_titulacion", "titulo_trabajo", "estudiante", "tutor",
] as const;

export type DatosMemoExtraidos = Record<(typeof CAMPOS_MEMO)[number], string>;

/**
 * Pide a la IA que extraiga los campos del memo en JSON. Siempre editable después.
 * El memo de Comisión Académica no siempre trae todos los campos (ej. título exacto del
 * trabajo, o el nombre completo del tutor) — si se sube también el trabajo de titulación,
 * su portada/primeras páginas sirve como fuente complementaria para completar lo que falte.
 */
export async function precargarDatosMemo(
  textoMemo: string,
  textoTrabajo?: string
): Promise<[DatosMemoExtraidos, null] | [null, string]> {
  if (!process.env.GROQ_API_KEY) {
    return [null, "IA no configurada (GROQ_API_KEY no definida)"];
  }

  const texto = (textoMemo || "").trim().slice(0, 6000);
  const textoAdicional = (textoTrabajo || "").trim().slice(0, 4000);
  if (texto.length < 20 && textoAdicional.length < 20) {
    return [null, "Los archivos no tienen suficiente texto para extraer datos."];
  }

  const instruction =
    "Extrae de los siguientes documentos de un proceso de titulación (ULEAM) estos " +
    "campos, en JSON estricto y sin texto adicional:\n" +
    '{"numero_memo": "", "fecha_memo": "YYYY-MM-DD", "facultad": "", "carrera": "", ' +
    '"opcion_titulacion": "", "titulo_trabajo": "", "estudiante": "", "tutor": ""}\n' +
    "El memo de Comisión Académica es la fuente principal; si un campo no aparece ahí " +
    "pero sí en el trabajo de titulación (portada, primeras páginas), complétalo desde ahí. " +
    "Si un campo no aparece en ninguno de los dos, déjalo como cadena vacía. No inventes datos.";

  const partes = [
    `${instruction}`,
    `\n\nTEXTO DEL MEMO:\n${texto || "(no se subió memo)"}`,
  ];
  if (textoAdicional.length >= 20) {
    partes.push(`\n\nTEXTO DEL TRABAJO DE TITULACIÓN (portada/primeras páginas):\n${textoAdicional}`);
  }

  try {
    const contenido = await pedirCompletionIA(
      [
        { role: "system", content: "Eres un asistente que extrae datos estructurados de documentos universitarios de titulación. Respondes solo JSON válido." },
        { role: "user", content: partes.join("") },
      ],
      { temperature: 0.1, reasoningEffort: "low", responseFormatJson: true }
    );
    const datos = JSON.parse(contenido);
    const resultado = {} as DatosMemoExtraidos;
    for (const campo of CAMPOS_MEMO) resultado[campo] = datos[campo] || "";
    return [resultado, null];
  } catch (e) {
    if (e instanceof SyntaxError) {
      return [null, "La IA no devolvió datos válidos. Completa el formulario manualmente."];
    }
    return [null, formatearErrorIA(e)];
  }
}

/** Sugerencia breve de observación para un criterio de la rúbrica, a partir del trabajo del estudiante. */
export async function sugerirComentarioCriterio(criterioTexto: string, textoTrabajo: string): Promise<[string, null] | [null, string]> {
  if (!process.env.GROQ_API_KEY) {
    return [null, "IA no configurada (GROQ_API_KEY no definida)"];
  }

  const fragmento = (textoTrabajo || "").trim().slice(0, 4000);
  if (fragmento.length < 20) {
    return [null, "No hay texto suficiente del trabajo del estudiante para sugerir."];
  }

  const instruction =
    "Eres un par lector evaluando un trabajo de titulación universitario. Evalúa exclusivamente " +
    `el siguiente criterio de la rúbrica: "${criterioTexto}".\n` +
    "Con base en el fragmento del trabajo del estudiante, escribe un comentario breve (máximo 40 " +
    "palabras) en español indicando si el criterio se cumple y por qué. Es solo una sugerencia para " +
    "el evaluador, no decides la calificación. No inventes contenido que no esté en el fragmento.";

  try {
    const resultado = await pedirCompletionIA(
      [
        { role: "system", content: "Eres un asistente que redacta observaciones breves para evaluadores universitarios." },
        { role: "user", content: `${instruction}\n\nFRAGMENTO DEL TRABAJO:\n${fragmento}` },
      ],
      { temperature: 0.3, reasoningEffort: "low" }
    );
    return [resultado, null];
  } catch (e) {
    return [null, formatearErrorIA(e)];
  }
}
