import { NextRequest, NextResponse } from "next/server";
import { precargarDesdeDoi } from "@/app/contribuciones/_lib/extraerContribucion";
import { enlaceContribucionVigente } from "@/lib/enlaceContribucionServer";

export const dynamic = "force-dynamic";

// Público (sin sesión), autorizado solo por un enlace de contribución vigente.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  if (!(await enlaceContribucionVigente(params.token))) {
    return NextResponse.json({ error: "Este enlace ya no está disponible" }, { status: 410 });
  }

  const body = await request.json().catch(() => null);
  const doi = body?.doi;
  if (!doi || typeof doi !== "string") {
    return NextResponse.json({ error: "Falta el DOI o la URL." }, { status: 400 });
  }

  const [datos, error] = await precargarDesdeDoi(doi);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(datos);
}
