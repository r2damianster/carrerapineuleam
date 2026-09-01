import { NextRequest, NextResponse } from "next/server";
import { getAppSessionFromCookies } from "@/lib/session";
import { precargarDesdeDoi, marcarAutoresDeCarrera } from "@/app/contribuciones/_lib/extraerContribucion";

export async function POST(request: NextRequest) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !["profesor", "admin"].includes(usuario.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const doi = body?.doi;
  if (!doi || typeof doi !== "string") {
    return NextResponse.json({ error: "Falta el DOI o la URL." }, { status: 400 });
  }

  const [datos, error] = await precargarDesdeDoi(doi);
  if (error) return NextResponse.json({ error }, { status: 400 });
  datos!.authors = await marcarAutoresDeCarrera(datos!.authors);
  return NextResponse.json(datos);
}
