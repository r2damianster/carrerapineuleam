import * as XLSX from "xlsx";

/** Estudiante leído de un archivo. `nombre` viene vacío si el archivo solo trae el correo. */
export interface EstudianteLista {
  nombre: string;
  correo: string;
}

export interface ListaAnalizada {
  archivo: string;
  formato: string;
  asignatura: string;
  paralelo: string;
  periodo: string;
  codigoCurso: string;
  estudiantes: EstudianteLista[];
  advertencias: string[];
}

const REGEX_CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export function normalizarTexto(texto: string): string {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function limpiarEspacios(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

function esValorBasura(texto: string): boolean {
  const t = normalizarTexto(texto);
  return t === "" || t === "nan" || t === "-" || t === "null" || t === "undefined";
}

// ---------------------------------------------------------------------------
// Metadatos desde el nombre del archivo
// "A -- METODOLOGÍA DE INVESTIGACIÓN II--1212364--20262-1 Calificaciones.xlsx"
// ---------------------------------------------------------------------------

const PALABRAS_MENORES = new Set([
  "de", "del", "la", "las", "los", "el", "y", "e", "en", "para", "a", "con", "por",
  "of", "and", "the", "in", "for", "to", "on",
]);

// Palabras que suelen venir sin tilde en los exportes de la plataforma.
const TILDES_COMUNES: Record<string, string> = {
  etica: "ética", metodologia: "metodología", investigacion: "investigación", pedagogia: "pedagogía",
  psicologia: "psicología", educacion: "educación", basica: "básica", didactica: "didáctica",
  practica: "práctica", tecnologia: "tecnología", evaluacion: "evaluación", planificacion: "planificación",
  gestion: "gestión", ingles: "inglés", linguistica: "lingüística", fonetica: "fonética",
  gramatica: "gramática", literatura: "literatura", comunicacion: "comunicación", proyecto: "proyecto",
};

function aTituloAsignatura(texto: string): string {
  return limpiarEspacios(texto)
    .toLowerCase()
    .split(" ")
    .map((crudo, indice) => {
      const palabra = TILDES_COMUNES[crudo] ?? crudo;
      if (/^[ivx]+$/i.test(palabra)) return palabra.toUpperCase();
      if (indice > 0 && PALABRAS_MENORES.has(palabra)) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(" ");
}

function metadatosDesdeNombreArchivo(nombreArchivo: string) {
  const sinExtension = nombreArchivo.replace(/(\.[A-Za-z0-9]{2,5}){1,2}$/, "");
  const segmentos = sinExtension.split("--").map((s) => s.trim());
  const resultado = { asignatura: "", paralelo: "", periodo: "", codigoCurso: "" };
  if (segmentos.length < 2) return resultado;

  const ultimoTokenParalelo = segmentos[0].split(/[_\s]+/).filter(Boolean).pop() ?? "";
  resultado.paralelo = /^[A-Za-z]$/.test(ultimoTokenParalelo) ? ultimoTokenParalelo.toUpperCase() : "";
  resultado.asignatura = aTituloAsignatura(segmentos[1]);
  if (segmentos[2] && /^\d+$/.test(segmentos[2])) resultado.codigoCurso = segmentos[2];
  const periodo = segmentos.slice(2).join(" ").match(/(\d{4})(\d)-\d/);
  if (periodo) resultado.periodo = `${periodo[1]}-${periodo[2]}`;
  return resultado;
}

// ---------------------------------------------------------------------------
// Lectura de tablas (xlsx, xls, ods, html, csv)
// ---------------------------------------------------------------------------

function decodificarTexto(buffer: Buffer): string {
  const utf8 = buffer.toString("utf-8").replace(/^﻿/, "");
  return utf8.includes("�") ? buffer.toString("latin1") : utf8;
}

function detectarSeparador(primerasLineas: string[]): string {
  const candidatos = [";", ",", "\t", "|"];
  let mejor = ",";
  let mejorConteo = 0;
  for (const separador of candidatos) {
    const conteo = primerasLineas.reduce((suma, linea) => suma + linea.split(separador).length - 1, 0);
    if (conteo > mejorConteo) {
      mejorConteo = conteo;
      mejor = separador;
    }
  }
  return mejor;
}

function parsearCsv(texto: string): string[][] {
  const lineas = texto.split(/\r?\n/);
  const separador = detectarSeparador(lineas.slice(0, 10));
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (entreComillas) {
      if (caracter === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
      else if (caracter === '"') entreComillas = false;
      else celda += caracter;
    } else if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === separador) {
      fila.push(celda); celda = "";
    } else if (caracter === "\n" || caracter === "\r") {
      if (caracter === "\r" && texto[i + 1] === "\n") i++;
      fila.push(celda); celda = "";
      filas.push(fila); fila = [];
    } else {
      celda += caracter;
    }
  }
  if (celda !== "" || fila.length > 0) { fila.push(celda); filas.push(fila); }
  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

function leerFilasTabla(buffer: Buffer, extension: string): string[][] {
  if (extension === "csv" || extension === "txt" || extension === "tsv") {
    return parsearCsv(decodificarTexto(buffer));
  }
  const libro = XLSX.read(buffer, { type: "buffer" });
  const nombreHoja = libro.SheetNames.find((n) => {
    const ref = libro.Sheets[n]["!ref"];
    return ref && ref !== "A1";
  }) ?? libro.SheetNames[0];
  if (!nombreHoja) return [];
  const filas: unknown[][] = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja], { header: 1, defval: "", raw: false });
  return filas.map((f) => f.map((c) => String(c ?? "")));
}

// ---------------------------------------------------------------------------
// XML genérico: registros = grupos de etiquetas hoja; se reconoce nombre/apellido/correo
// ---------------------------------------------------------------------------

function leerFilasXml(texto: string): string[][] {
  const encabezado = ["nombre", "apellido", "nombre completo", "correo"];
  const registros: Record<string, string>[] = [];
  let actual: Record<string, string> = {};
  const regexEtiqueta = /<([A-Za-z_][\w:.-]*)(?:\s[^>]*)?>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*?))\s*<\/\1>/g;
  let coincidencia: RegExpExecArray | null;

  while ((coincidencia = regexEtiqueta.exec(texto)) !== null) {
    const etiqueta = normalizarTexto(coincidencia[1]);
    const valor = limpiarEspacios(coincidencia[2] ?? coincidencia[3] ?? "");
    if (!valor) continue;
    let campo = "";
    if (/apellid|surname|lastname|last_name|familyname/.test(etiqueta)) campo = "apellido";
    else if (/mail|correo/.test(etiqueta)) campo = "correo";
    else if (/fullname|full_name|nombrecompleto|nombre_completo|^name$|^student$|^estudiante$/.test(etiqueta)) campo = "nombre completo";
    else if (/^(first|given)?_?name$|^nombres?$|firstname|givenname/.test(etiqueta)) campo = "nombre";
    if (!campo) continue;
    if (actual[campo] !== undefined) { registros.push(actual); actual = {}; }
    actual[campo] = valor;
  }
  if (Object.keys(actual).length > 0) registros.push(actual);
  if (registros.length === 0) return [];
  return [encabezado, ...registros.map((r) => [r["nombre"] ?? "", r["apellido"] ?? "", r["nombre completo"] ?? "", r["correo"] ?? ""])];
}

// ---------------------------------------------------------------------------
// Filas -> estudiantes
// ---------------------------------------------------------------------------

interface Columnas {
  nombre: number;
  apellido: number;
  completo: number;
  correo: number;
}

function clasificarEncabezados(encabezados: string[]): Columnas {
  const columnas: Columnas = { nombre: -1, apellido: -1, completo: -1, correo: -1 };
  encabezados.forEach((crudo, indice) => {
    const h = normalizarTexto(crudo);
    if (!h) return;
    if (/usuario|username|user name/.test(h)) return;
    if (/apellid|surname|last ?name/.test(h) && !/nombre/.test(h.replace(/apellid\w*/, ""))) {
      if (columnas.apellido < 0) columnas.apellido = indice;
    } else if (/completo|full ?name|apellidos? y nombres?|nombres? y apellidos?|^estudiante$|^alumno$|^name$/.test(h)) {
      if (columnas.completo < 0) columnas.completo = indice;
    } else if (/^nombres?$|first ?name|given/.test(h)) {
      if (columnas.nombre < 0) columnas.nombre = indice;
    } else if (/correo|e-?mail|mail/.test(h)) {
      if (columnas.correo < 0) columnas.correo = indice;
    }
  });
  return columnas;
}

function esFilaEncabezado(fila: string[]): boolean {
  if (fila.some((c) => REGEX_CORREO.test(c))) return false;
  return fila.some((c) => /nombre|apellid|correo|e-?mail|name|estudiante|alumno/i.test(normalizarTexto(c)));
}

function extraerEstudiantes(filas: string[][], advertencias: string[]): EstudianteLista[] {
  const indiceEncabezado = filas.slice(0, 10).findIndex(esFilaEncabezado);
  const resultado: EstudianteLista[] = [];

  if (indiceEncabezado >= 0) {
    const columnas = clasificarEncabezados(filas[indiceEncabezado]);
    const tieneColumnaNombre = columnas.nombre >= 0 || columnas.apellido >= 0 || columnas.completo >= 0;
    for (const fila of filas.slice(indiceEncabezado + 1)) {
      const celda = (i: number) => (i >= 0 ? limpiarEspacios(fila[i] ?? "") : "");
      let correo = celda(columnas.correo);
      if (!REGEX_CORREO.test(correo)) correo = fila.map((c) => c.match(REGEX_CORREO)?.[0] ?? "").find(Boolean) ?? "";

      let nombre = "";
      if (columnas.completo >= 0) nombre = celda(columnas.completo);
      else {
        const apellido = celda(columnas.apellido);
        const nombres = celda(columnas.nombre);
        nombre = limpiarEspacios(`${esValorBasura(apellido) ? "" : apellido} ${esValorBasura(nombres) ? "" : nombres}`);
      }
      if (esValorBasura(nombre)) nombre = "";
      if (!nombre && !correo) continue;
      resultado.push({ nombre: nombre.toUpperCase(), correo: correo.toLowerCase() });
    }
    if (!tieneColumnaNombre && resultado.length > 0) {
      advertencias.push("El archivo no tiene columnas de nombre ni apellido.");
    }
    return resultado;
  }

  // Sin encabezado: tomar de cada fila el correo y, si existe, la primera celda de texto que parezca un nombre.
  for (const fila of filas) {
    const correo = fila.map((c) => c.match(REGEX_CORREO)?.[0] ?? "").find(Boolean) ?? "";
    const nombre = fila
      .map(limpiarEspacios)
      .find((c) => c && !REGEX_CORREO.test(c) && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(c)) ?? "";
    if (!correo && !nombre) continue;
    resultado.push({ nombre: nombre.toUpperCase(), correo: correo.toLowerCase() });
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// API principal
// ---------------------------------------------------------------------------

export async function analizarListaEstudiantes(archivo: File): Promise<ListaAnalizada> {
  const extension = (archivo.name.split(".").pop() ?? "").toLowerCase();
  const meta = metadatosDesdeNombreArchivo(archivo.name);
  const advertencias: string[] = [];
  let estudiantes: EstudianteLista[] = [];
  let formato = extension || "desconocido";

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    let filas: string[][];
    if (extension === "xml") {
      filas = leerFilasXml(decodificarTexto(buffer));
      if (filas.length === 0) advertencias.push("El XML no contiene estudiantes (sin nombres ni correos). Vuelva a exportarlo desde la plataforma.");
    } else {
      filas = leerFilasTabla(buffer, extension);
      // Caso "solo correos": la primera línea puede ser un código en base64 (ej. Qy0xMjEyMjA4 = C-1212208).
      const primera = filas[0]?.[0]?.trim() ?? "";
      if (filas.length > 0 && filas[0].length === 1 && /^[A-Za-z0-9+/=]{8,}$/.test(primera) && !REGEX_CORREO.test(primera)) {
        const decodificado = Buffer.from(primera, "base64").toString("utf-8");
        if (/^[\w-]{3,20}$/.test(decodificado)) {
          if (!meta.codigoCurso) meta.codigoCurso = decodificado.replace(/^C-/, "");
          filas = filas.slice(1);
        }
      }
      if (filas.length === 0) advertencias.push("El archivo está vacío.");
    }
    estudiantes = extraerEstudiantes(filas, advertencias);
    if (estudiantes.length === 0 && advertencias.length === 0) {
      advertencias.push("No se encontraron estudiantes (ni nombres ni correos). El archivo parece vacío o de otro formato; vuelva a exportarlo.");
    }
  } catch (error) {
    advertencias.push(`No se pudo leer el archivo: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Quitar duplicados internos (mismo correo, o mismo nombre si no hay correo).
  const vistos = new Set<string>();
  const unicos: EstudianteLista[] = [];
  for (const estudiante of estudiantes) {
    const clave = estudiante.correo || normalizarTexto(estudiante.nombre);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    unicos.push(estudiante);
  }
  if (unicos.length < estudiantes.length) {
    advertencias.push(`Se descartaron ${estudiantes.length - unicos.length} filas repetidas dentro del archivo.`);
  }

  unicos.sort((a, b) => normalizarTexto(a.nombre || a.correo).localeCompare(normalizarTexto(b.nombre || b.correo)));
  const sinNombre = unicos.filter((e) => !e.nombre).length;
  if (sinNombre > 0 && sinNombre === unicos.length) {
    advertencias.push("Este archivo solo trae correos, sin nombres. Complételos en la tabla o exporte una lista con Nombre y Apellido.");
  } else if (sinNombre > 0) {
    advertencias.push(`${sinNombre} estudiantes sin nombre. Complételos en la tabla.`);
  }

  return { archivo: archivo.name, formato, ...meta, estudiantes: unicos, advertencias };
}

/** Marca como advertencia los estudiantes que aparecen en más de un archivo (deberían ser únicos). */
export function detectarRepetidosEntreArchivos(listas: ListaAnalizada[]) {
  const porClave = new Map<string, number[]>();
  listas.forEach((lista, indice) => {
    for (const estudiante of lista.estudiantes) {
      const clave = estudiante.correo || normalizarTexto(estudiante.nombre);
      if (!clave) continue;
      porClave.set(clave, [...(porClave.get(clave) ?? []), indice]);
    }
  });
  const repetidosPorLista = new Map<number, number>();
  for (const indices of Array.from(porClave.values())) {
    if (indices.length < 2) continue;
    for (const indice of indices) repetidosPorLista.set(indice, (repetidosPorLista.get(indice) ?? 0) + 1);
  }
  repetidosPorLista.forEach((cantidad, indice) => {
    listas[indice].advertencias.push(
      `${cantidad} estudiantes aparecen también en otro de los archivos subidos. Revise que no sea un archivo repetido o de otro curso.`,
    );
  });
}
