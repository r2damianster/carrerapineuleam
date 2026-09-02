import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

const TEMPLATES_DIR = path.join(process.cwd(), "app", "utilidades", "_templates");

export type PlantillaDatos = Record<string, unknown>;

/**
 * Renderiza una plantilla .docx de `_templates/` reemplazando sus tags {{ }}.
 * Soporta loops ({#tag}...{/tag}) si la plantilla los trae.
 */
/**
 * Word inserta elementos vacíos (marcas de revisión ortográfica/gramatical, saltos de
 * página renderizados, marcadores) en medio del texto de un párrafo. Cuando caen DENTRO
 * de un tag {{ }}, parten el tag en dos <w:r> y docxtemplater ya no lo reconoce (queda
 * como texto literal sin reemplazar). Se eliminan porque son elementos vacíos/autocontenidos:
 * quitarlos no cambia el contenido visible del documento.
 */
function limpiarXmlDeMarcasDeWord(xml: string): string {
  return xml
    .replace(/<w:proofErr\b[^/]*\/>/g, "")
    .replace(/<w:bookmarkStart\b[^/]*\/>/g, "")
    .replace(/<w:bookmarkEnd\b[^/]*\/>/g, "")
    .replace(/<w:lastRenderedPageBreak\s*\/>/g, "");
}

/**
 * Igual al parser por defecto de docxtemplater (ver node_modules/docxtemplater/js/doc-utils.js),
 * pero recortando espacios: algunas plantillas (PATs) traen tags como "{{ No }}" en vez de
 * "{{No}}" y docxtemplater no recorta el contenido del tag antes de buscarlo en el contexto.
 */
function parserConTrim(tag: string) {
  const limpio = tag.trim();
  return {
    get(scope: unknown) {
      if (limpio === ".") return scope;
      if (scope && typeof scope === "object" && Object.prototype.hasOwnProperty.call(scope, limpio)) {
        return (scope as Record<string, unknown>)[limpio];
      }
      return undefined;
    },
  };
}

export function renderizarPlantilla(nombreArchivo: string, datos: PlantillaDatos): Buffer {
  const rutaPlantilla = path.join(TEMPLATES_DIR, nombreArchivo);
  const contenido = fs.readFileSync(rutaPlantilla, "binary");
  const zip = new PizZip(contenido);
  const documentXmlPath = "word/document.xml";
  zip.file(documentXmlPath, limpiarXmlDeMarcasDeWord(zip.file(documentXmlPath)!.asText()));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: () => "",
    parser: parserConTrim,
  });
  doc.render(datos);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Fusiona varios buffers .docx en uno solo, insertando salto de página entre cada uno.
 * Reemplaza el uso de `docxcompose` en Python (ver logic/PATS/Pat04.py).
 *
 * El primer buffer manda: su `sectPr` (con headerReference/footerReference) es el que
 * queda en el documento final — si se tomara el del último documento (como antes), un
 * documento sin plantilla (ej. las evidencias fotográficas armadas con la librería `docx`,
 * sin encabezado propio) borraba el logo del encabezado de TODO el archivo fusionado.
 * También reimporta las imágenes de los documentos que no sean el primero (relaciones
 * `r:embed`), remapeando sus IDs para no colisionar con los que ya usa el documento base
 * — si no, la imagen queda apuntando a un rId ajeno (ej. webSettings) y no carga en Word.
 */
export function fusionarDocx(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) throw new Error("fusionarDocx: no hay documentos para fusionar");
  if (buffers.length === 1) return buffers[0];

  const zips = buffers.map((buf) => new PizZip(buf));
  const xmls = zips.map((zip) => zip.file("word/document.xml")!.asText());

  const SECT_PR_RE = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/;
  const BODY_RE = /<w:body\b[^>]*>([\s\S]*)<\/w:body>/;
  const RELATIONSHIP_TAG_RE = /<Relationship\b[^>]*\/>/g;

  const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

  const zipFinal = zips[0];
  const relsPath = "word/_rels/document.xml.rels";
  let relsFinalXml =
    zipFinal.file(relsPath)?.asText() ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

  const idsUsados = [...relsFinalXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  let siguienteId = (idsUsados.length > 0 ? Math.max(...idsUsados) : 0) + 1;

  const cuerpos: string[] = [];
  let sectPrFinal = "";

  xmls.forEach((xml, idx) => {
    const bodyMatch = BODY_RE.exec(xml);
    if (!bodyMatch) throw new Error("fusionarDocx: documento sin <w:body>");
    let cuerpo = bodyMatch[1];

    const sectPrMatch = SECT_PR_RE.exec(cuerpo);
    if (sectPrMatch) {
      if (idx === 0) sectPrFinal = sectPrMatch[0];
      cuerpo = cuerpo.replace(SECT_PR_RE, "");
    }

    if (idx > 0) {
      const relsOrigenXml = zips[idx].file(relsPath)?.asText() ?? "";
      for (const tagMatch of relsOrigenXml.matchAll(RELATIONSHIP_TAG_RE)) {
        const tag = tagMatch[0];
        const idOriginal = /Id="([^"]+)"/.exec(tag)?.[1];
        const tipo = /Type="([^"]+)"/.exec(tag)?.[1];
        const target = /Target="([^"]+)"/.exec(tag)?.[1];
        if (!idOriginal || !tipo?.endsWith("/image") || !target) continue;

        const archivoImagen = zips[idx].file(`word/${target}`);
        if (!archivoImagen) continue;

        const extension = target.split(".").pop() || "png";
        const nuevoNombre = `fusion${idx}_${idOriginal}.${extension}`;
        zipFinal.file(`word/media/${nuevoNombre}`, archivoImagen.asUint8Array());

        const nuevoId = `rId${siguienteId++}`;
        cuerpo = cuerpo.replace(new RegExp(`r:embed="${idOriginal}"`, "g"), `r:embed="${nuevoId}"`);
        relsFinalXml = relsFinalXml.replace(
          "</Relationships>",
          `<Relationship Id="${nuevoId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nuevoNombre}"/></Relationships>`
        );
      }
    }

    cuerpos.push(idx === 0 ? cuerpo : PAGE_BREAK + cuerpo);
  });

  const cuerpoFinal = cuerpos.join("") + sectPrFinal;
  const xmlFinal = xmls[0].replace(BODY_RE, `<w:body>${cuerpoFinal}</w:body>`);

  zipFinal.file("word/document.xml", xmlFinal);
  zipFinal.file(relsPath, relsFinalXml);
  return zipFinal.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
