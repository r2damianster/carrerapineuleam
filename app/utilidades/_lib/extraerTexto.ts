import mammoth from "mammoth";

/**
 * pdf-parse importa pdfjs-dist/legacy/build/pdf.mjs, que ejecuta `new DOMMatrix()` a nivel
 * de módulo (src/display/canvas.js) aunque solo se use extracción de texto — DOMMatrix no
 * existe en el runtime Node de Vercel, así que el import estático crashea la función entera
 * (500 en HTML, no JSON). Polyfill mínimo + import dinámico para evitarlo.
 */
async function cargarPDFParse() {
  const globalObj = globalThis as Record<string, unknown>;
  if (typeof globalObj.DOMMatrix === "undefined") {
    globalObj.DOMMatrix = class DOMMatrix {
      constructor(_init?: unknown) {}
      multiply() { return this; }
      translate() { return this; }
      scale() { return this; }
      inverse() { return this; }
    };
  }
  return import("pdf-parse");
}

/** Extrae texto plano de un PDF o DOCX (bytes en memoria). Lanza si el formato no es soportado. */
export async function extraerTexto(nombreArchivo: string, contenido: Buffer): Promise<string> {
  const nombre = (nombreArchivo || "").toLowerCase();
  if (nombre.endsWith(".pdf")) {
    const { PDFParse } = await cargarPDFParse();
    const parser = new PDFParse({ data: contenido });
    try {
      const resultado = await parser.getText();
      return resultado.text;
    } finally {
      await parser.destroy();
    }
  }
  if (nombre.endsWith(".docx")) {
    const resultado = await mammoth.extractRawText({ buffer: contenido });
    return resultado.value;
  }
  throw new Error("Formato no soportado para extracción de texto (use PDF o DOCX).");
}
