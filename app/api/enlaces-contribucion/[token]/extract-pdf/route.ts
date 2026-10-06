import { NextRequest, NextResponse } from "next/server";
import { extraerTexto } from "@/app/utilidades/_lib/extraerTexto";
import { precargarDesdeTexto } from "@/app/contribuciones/_lib/extraerContribucion";
import { enlaceContribucionVigente } from "@/lib/enlaceContribucionServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES_PDF = 15 * 1024 * 1024;

// Público (sin sesión), autorizado solo por un enlace de contribución vigente.
// Usa IA (Groq): el tope de tamaño evita abuso por quien no tiene cuenta.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  if (!(await enlaceContribucionVigente(params.token))) {
    return NextResponse.json({ error: "Este enlace ya no está disponible" }, { status: 410 });
  }

  try {
    const form = await request.formData();
    const archivo = form.get("archivo");
    if (!(archivo instanceof File) || !archivo.size) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }
    if (archivo.size > MAX_BYTES_PDF) {
      return NextResponse.json({ error: "El archivo supera los 15 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const texto = await extraerTexto(archivo.name, buffer);
    const [datos, error] = await precargarDesdeTexto(texto);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(datos);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
