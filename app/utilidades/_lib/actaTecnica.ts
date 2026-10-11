import {
  Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun,
} from "docx";
import { enriquecerTexto } from "./enriquecerTexto";
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

/** Redacta cada sección del acta con IA a partir de las notas del usuario. Siempre se ejecuta al generar (igual que logic/actas_logic.py:generar_texto_ia). */
export async function generarTextoIA(tipo: "aspectos" | "desarrollo" | "compromisos", notasUsuario: string): Promise<string> {
  if (!notasUsuario || notasUsuario.trim().length < 2) {
    return "No se registraron detalles adicionales para esta sección.";
  }
  if (!process.env.GROQ_API_KEY) {
    return `[IA no configurada] ${notasUsuario}`;
  }

  // Los prompts viven en un solo lugar (enriquecerTexto.ts → acta_*), compartidos con el botón
  // "Mejorar con IA" del formulario, para que ambos caminos redacten con el mismo criterio.
  const [resultado, error] = await enriquecerTexto(`acta_${tipo}`, notasUsuario);
  if (error !== null) {
    return `${error} (notas originales: ${notasUsuario})`;
  }
  return resultado.replace(/\*\*/g, "").replace(/\*/g, "•");
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

  const actaBuffer = renderizarPlantilla("utilidades-acta-tecnica.docx", contexto);
  if (fotos.length === 0) return actaBuffer;

  const evidenciasBuffer = await crearDocxEvidencias(fotos);
  return fusionarDocx([actaBuffer, evidenciasBuffer]);
}

export function formatearFechaActa(fecha: string): string {
  return formatearFechaLarga(fecha);
}
