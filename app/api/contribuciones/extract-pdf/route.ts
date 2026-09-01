import { NextRequest, NextResponse } from "next/server";
import { getAppSessionFromCookies } from "@/lib/session";
import { extraerTexto } from "@/app/utilidades/_lib/extraerTexto";
import { precargarDesdeTexto } from "@/app/contribuciones/_lib/extraerContribucion";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !["profesor", "admin"].includes(usuario.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const archivo = form.get("archivo");
    if (!(archivo instanceof File) || !archivo.size) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
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
