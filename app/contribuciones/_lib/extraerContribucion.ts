import { neon } from "@neondatabase/serverless";
import { pedirCompletionIA, formatearErrorIA } from "../../utilidades/_lib/groq";

export interface AutorExtraido {
  authorName: string;
  order: number;
  isCarreraAuthor: boolean;
}

export interface DatosContribucionExtraidos {
  titulo: string;
  fechaPublicacion: string; // YYYY-MM-DD, cadena vacía si no se encontró
  campoDetallado: string;
  estado: "PUBLICADO" | "ACEPTADO" | "OTRO";
  authors: AutorExtraido[];
}

const CAMPOS_VACIOS: DatosContribucionExtraidos = {
  titulo: "",
  fechaPublicacion: "",
  campoDetallado: "",
  estado: "OTRO",
  authors: [],
};

function normalizarAutores(nombres: string[]): AutorExtraido[] {
  return nombres
    .filter(nombre => typeof nombre === "string" && nombre.trim().length > 0)
    .slice(0, 5)
    .map((authorName, index) => ({ authorName: authorName.trim(), order: index + 1, isCarreraAuthor: false }));
}

/** Extrae los campos del formulario desde el texto plano de un PDF, vía Groq. Siempre editable después. */
export async function precargarDesdeTexto(textoArticulo: string): Promise<[DatosContribucionExtraidos, null] | [null, string]> {
  if (!process.env.GROQ_API_KEY) {
    return [null, "IA no configurada (GROQ_API_KEY no definida)"];
  }

  const texto = (textoArticulo || "").trim().slice(0, 12000);
  if (texto.length < 50) {
    return [null, "El archivo no tiene suficiente texto para extraer datos."];
  }

  const instruction =
    "Extrae del siguiente artículo/documento académico estos campos, en JSON estricto y sin texto adicional:\n" +
    '{"titulo": "", "fechaPublicacion": "YYYY-MM-DD", "campoDetallado": "", "estado": "PUBLICADO|ACEPTADO|OTRO", "autores": [""]}\n' +
    '"campoDetallado" es un resumen breve (2-3 frases) del tema/campo que aborda el documento, en español. ' +
    '"autores" es la lista de nombres completos de los autores, en el orden en que aparecen (máximo 5). ' +
    'Si un campo no aparece en el texto, déjalo como cadena vacía (o "OTRO" para estado, [] para autores). No inventes datos.';

  try {
    const contenido = await pedirCompletionIA(
      [
        { role: "system", content: "Eres un asistente que extrae datos estructurados de artículos académicos. Respondes solo JSON válido." },
        { role: "user", content: `${instruction}\n\nTEXTO DEL DOCUMENTO:\n${texto}` },
      ],
      { temperature: 0.1, reasoningEffort: "low", responseFormatJson: true }
    );
    const datos = JSON.parse(contenido);
    const estado = ["PUBLICADO", "ACEPTADO", "OTRO"].includes(datos.estado) ? datos.estado : "OTRO";
    return [
      {
        titulo: datos.titulo || "",
        fechaPublicacion: datos.fechaPublicacion || "",
        campoDetallado: datos.campoDetallado || "",
        estado,
        authors: normalizarAutores(Array.isArray(datos.autores) ? datos.autores : []),
      },
      null,
    ];
  } catch (e) {
    if (e instanceof SyntaxError) {
      return [null, "La IA no devolvió datos válidos. Completa el formulario manualmente."];
    }
    return [null, formatearErrorIA(e)];
  }
}

function limpiarHtml(texto: string): string {
  return texto.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function fechaDesdeDateParts(dateParts: number[] | undefined): string {
  if (!dateParts || !dateParts.length) return "";
  const [anio, mes = 1, dia = 1] = dateParts;
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Busca metadatos de una publicación por DOI (o URL que contenga un DOI) en la API pública de Crossref. */
export async function precargarDesdeDoi(doiOTexto: string): Promise<[DatosContribucionExtraidos, null] | [null, string]> {
  const match = (doiOTexto || "").match(/10\.\d{4,9}\/[^\s"'<>]+/);
  if (!match) {
    return [null, "No se detectó un DOI válido. Pega el DOI (ej: 10.1234/abcd.5678) o la URL doi.org."];
  }
  const doi = match[0].replace(/[.,;]+$/, "");

  let respuesta: Response;
  try {
    respuesta = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=arturo.rodriguez30@gmail.com`);
  } catch (e) {
    return [null, "No se pudo contactar Crossref. Verifica tu conexión e intenta de nuevo."];
  }
  if (respuesta.status === 404) {
    return [null, `No se encontró ningún registro para el DOI ${doi} en Crossref.`];
  }
  if (!respuesta.ok) {
    return [null, `Crossref respondió con error (${respuesta.status}).`];
  }

  const json = await respuesta.json();
  const item = json?.message;
  if (!item) {
    return [null, "Crossref no devolvió datos para ese DOI."];
  }

  const fecha =
    fechaDesdeDateParts(item["published-print"]?.["date-parts"]?.[0]) ||
    fechaDesdeDateParts(item["published-online"]?.["date-parts"]?.[0]) ||
    fechaDesdeDateParts(item.issued?.["date-parts"]?.[0]);

  const nombresAutores: string[] = Array.isArray(item.author)
    ? item.author.map((a: any) => [a.given, a.family].filter(Boolean).join(" ").trim())
    : [];

  return [
    {
      ...CAMPOS_VACIOS,
      titulo: Array.isArray(item.title) ? item.title[0] || "" : "",
      fechaPublicacion: fecha,
      campoDetallado: item.abstract ? limpiarHtml(item.abstract) : "",
      estado: "PUBLICADO",
      authors: normalizarAutores(nombresAutores),
    },
    null,
  ];
}

function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim();
}

function tokensSignificativos(texto: string): string[] {
  return normalizarNombre(texto)
    .split(/\s+/)
    .filter(token => token.length >= 3);
}

/**
 * Marca isCarreraAuthor=true en los autores extraídos cuyo nombre coincida con un docente
 * registrado (usuarios.rol='profesor'). Comparación por tokens (nombres+apellidos, sin acentos)
 * para tolerar orden distinto ("Nombre Apellido" vs "Apellido, Nombre") y variantes menores.
 * Es una sugerencia — el docente sigue pudiendo des/marcar cada autor manualmente en el wizard.
 */
export async function marcarAutoresDeCarrera(authors: AutorExtraido[]): Promise<AutorExtraido[]> {
  if (!authors.length || !process.env.DATABASE_URL) return authors;

  let docentes: { id: number; nombres: string; apellidos: string }[];
  try {
    const sql = neon(process.env.DATABASE_URL);
    docentes = (await sql`SELECT id, nombres, apellidos FROM usuarios WHERE rol = 'profesor'`) as any;
  } catch {
    return authors; // si falla la consulta, se deja la sugerencia por defecto (sin marcar)
  }

  const docentesConTokens = docentes
    .map(d => ({ tokens: tokensSignificativos(`${d.nombres} ${d.apellidos}`) }))
    .filter(d => d.tokens.length > 0);

  return authors.map(autor => {
    const tokensAutor = new Set(tokensSignificativos(autor.authorName));
    if (tokensAutor.size === 0) return autor;

    const coincide = docentesConTokens.some(docente => {
      const coincidencias = docente.tokens.filter(t => tokensAutor.has(t)).length;
      const minimoRequerido = docente.tokens.length <= 2 ? docente.tokens.length : 2;
      return coincidencias >= minimoRequerido;
    });

    return coincide ? { ...autor, isCarreraAuthor: true } : autor;
  });
}
