import {
  Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun,
} from "docx";
import { pedirCompletionIA, formatearErrorIA } from "./groq";
import { formatearFechaLarga } from "./fechas";
import { renderizarPlantilla, fusionarDocx } from "./docxtemplater";

interface Participante {
  nombre: string;
  cargo: string;
}

interface Firmante {
  nombre: string;
  cargo: string;
}

export interface DatosActa {
  numeroActa: string;
  fechaLarga: string;
  lugar: string;
  horaInicio: string;
  horaFin: string;
  convocanteNombre: string;
  convocanteCargo: string;
  participantes: Participante[];
  aspectosIA: string;
  desarrolloIA: string;
  compromisosIA: string;
  elaboradoTitulo: string;
  elaboradoNombre: string;
}

const PROMPTS_ACTA: Record<"aspectos" | "desarrollo" | "compromisos", { seccion: string; instruccion: string; temperature: number }> = {
  aspectos: {
    seccion: "Puntos del orden del día",
    instruccion:
      "TAREA: Organiza los puntos del orden del día.\n" +
      "REGLAS: No expandas el texto innecesariamente. Solo corrige ortografía y formaliza levemente el vocabulario.\n" +
      "FORMATO: Presenta cada punto precedido por una viñeta (•). No redactes párrafos largos.",
    temperature: 0.2,
  },
  compromisos: {
    seccion: "Decisiones y compromisos finales",
    instruccion:
      "TAREA: Redacta los acuerdos y compromisos institucionales.\n" +
      "REGLAS: Sé directo y breve. Mantén la esencia de la nota original sin añadir relleno.\n" +
      "FORMATO: Presenta cada compromiso precedido por una viñeta (•). Corrige coherencia y ortografía.",
    temperature: 0.2,
  },
  desarrollo: {
    seccion: "Desarrollo y deliberaciones de la reunión",
    instruccion:
      "TAREA: Convierte las notas en un relato académico fluido y profesional.\n" +
      "REGLAS: Aquí SÍ puedes expandirte. Conecta los puntos del orden del día con conectores lógicos.\n" +
      "FORMATO: Redacta en párrafos narrativos. Usa tono solemne (ej: 'asimismo', 'se procedió a').",
    temperature: 0.5,
  },
};

/** Redacta cada sección del acta con IA a partir de las notas del usuario. Siempre se ejecuta al generar (igual que logic/actas_logic.py:generar_texto_ia). */
export async function generarTextoIA(tipo: "aspectos" | "desarrollo" | "compromisos", notasUsuario: string): Promise<string> {
  if (!notasUsuario || notasUsuario.trim().length < 2) {
    return "No se registraron detalles adicionales para esta sección.";
  }
  if (!process.env.GROQ_API_KEY) {
    return `[IA no configurada] ${notasUsuario}`;
  }

  const config = PROMPTS_ACTA[tipo];
  const prompt =
    `Actúa como un Secretario Académico universitario de alto nivel.\n\n` +
    `SECCIÓN: ${config.seccion}.\n${config.instruccion}\n\n` +
    `NOTAS DEL USUARIO:\n${notasUsuario}`;

  try {
    const resultado = await pedirCompletionIA(
      [
        { role: "system", content: "Eres un redactor experto que diferencia entre listas breves y desarrollo narrativo." },
        { role: "user", content: prompt },
      ],
      { temperature: config.temperature, reasoningEffort: "low" }
    );
    return resultado.replace(/\*\*/g, "").replace(/\*/g, "•");
  } catch (e) {
    return `${formatearErrorIA(e)} (notas originales: ${notasUsuario})`;
  }
}

/** Construye una página adicional solo con las fotos de evidencia (la plantilla oficial no tiene tag para imágenes, solo un rótulo de sección). Se fusiona después del acta con fusionarDocx. */
async function crearDocxEvidencias(fotos: Array<{ buffer: Buffer; tipo: "png" | "jpg" }>): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: "EVIDENCIAS FOTOGRÁFICAS", bold: true, size: 24 })] }),
  ];
  fotos.forEach((foto, i) => {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: foto.tipo, data: foto.buffer, transformation: { width: 500, height: 350 } })],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, text: `Figura ${i + 1}` })
    );
  });
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export async function crearDocxActa(datos: DatosActa, fotos: Array<{ buffer: Buffer; tipo: "png" | "jpg" }>): Promise<Buffer> {
  const firmantes: Firmante[] = [
    { nombre: datos.convocanteNombre, cargo: datos.convocanteCargo },
    ...datos.participantes.slice(0, 9),
  ];
  while (firmantes.length < 10) firmantes.push({ nombre: "", cargo: "" });

  const contexto: Record<string, string> = {
    numero_acta: datos.numeroActa || "S/N",
    fecha_larga: datos.fechaLarga,
    lugar: datos.lugar,
    hora_inicio: datos.horaInicio,
    hora_fin: datos.horaFin,
    convocante_nombre: datos.convocanteNombre,
    convocante_cargo: datos.convocanteCargo,
    tabla_participantes:
      datos.participantes.length > 0
        ? datos.participantes.map((p) => `${p.nombre} — ${p.cargo}`).join("\n")
        : "Sin participantes registrados.",
    aspectos_ia: datos.aspectosIA,
    desarrollo_ia: datos.desarrolloIA,
    compromisos_ia: datos.compromisosIA,
    elaborado_titulo: datos.elaboradoTitulo,
    elaborado_nombre: datos.elaboradoNombre,
  };
  firmantes.forEach((f, i) => {
    contexto[`firmante_${i + 1}_nombre`] = f.nombre;
    contexto[`firmante_${i + 1}_cargo`] = f.cargo;
  });

  const actaBuffer = renderizarPlantilla("Acta_Tecnica.docx", contexto);
  if (fotos.length === 0) return actaBuffer;

  const evidenciasBuffer = await crearDocxEvidencias(fotos);
  return fusionarDocx([actaBuffer, evidenciasBuffer]);
}

export function formatearFechaActa(fecha: string): string {
  return formatearFechaLarga(fecha);
}
