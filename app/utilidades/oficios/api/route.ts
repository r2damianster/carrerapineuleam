import { NextRequest, NextResponse } from "next/server";
import { renderizarPlantilla } from "../../_lib/docxtemplater";
import { formatearFechaLarga } from "../../_lib/fechas";
import { respuestaDocx } from "../../_lib/respuestaArchivo";
import { requireDocenteApi } from "../../_lib/auth";

export const runtime = "nodejs";

interface FirmanteEntrada {
  titulo?: string;
  nombre?: string;
  cargo?: string;
}

function leerFirmantes(json: string): { TITULO: string; NOMBRE: string; CARGO: string }[] {
  let lista: FirmanteEntrada[] = [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) lista = parsed;
  } catch {
    // JSON inválido: se devuelve lista vacía y la validación de abajo lo reporta
  }
  return lista
    .map((firmante) => ({
      TITULO: (firmante.titulo ?? "").trim(),
      NOMBRE: (firmante.nombre ?? "").trim(),
      CARGO: (firmante.cargo ?? "").trim(),
    }))
    .filter((firmante) => firmante.NOMBRE);
}

const MAX_LINEAS_COPIA = 30;
const MAX_CARACTERES_LINEA_COPIA = 300;

/** Una persona por línea; descarta vacías y duplicadas (sin distinguir mayúsculas). */
function leerCopias(texto: string): string[] {
  const vistas = new Set<string>();
  const lineas: string[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES_LINEA_COPIA);
    const clave = limpia.toLowerCase();
    if (!limpia || vistas.has(clave)) continue;
    vistas.add(clave);
    lineas.push(limpia);
  }
  return lineas.slice(0, MAX_LINEAS_COPIA);
}

export async function POST(request: NextRequest) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const campo = (nombre: string) => (form.get(nombre)?.toString() ?? "").trim();

    const numOficio = campo("num_oficio");
    const copias = leerCopias(campo("copia_a"));
    const contexto = {
      NUM_OFICIO: numOficio,
      FECHA_EMISION: formatearFechaLarga(campo("fecha_emision")),
      CIUDAD: campo("ciudad") || "Manta",
      DESTINATARIO_NOMBRE: campo("destinatario_nombre"),
      DESTINATARIO_CARGO: campo("destinatario_cargo"),
      DESTINATARIO_CARRERA: campo("destinatario_carrera"),
      ASUNTO: campo("asunto"),
      CUERPO: campo("cuerpo"),
      FIRMANTES: leerFirmantes(campo("firmantes")),
      INICIALES: campo("iniciales"),
      TIENE_COPIA: copias.length > 0,
      COPIA_A: copias.join("\n"),
    };

    if (contexto.FIRMANTES.length === 0) {
      return NextResponse.json({ error: "Agrega al menos un firmante" }, { status: 400 });
    }

    const buffer = renderizarPlantilla("utilidades-oficio-hoja-carrera.docx", contexto);
    return respuestaDocx(buffer, `Oficio_${numOficio || "borrador"}.docx`);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
