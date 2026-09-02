import { NextRequest, NextResponse } from "next/server";
import { getAllDocentes, getDocentesByCarrera } from "../../../_lib/docentes";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const carrera = request.nextUrl.searchParams.get("carrera");
    const destinatarios = carrera ? await getDocentesByCarrera(carrera) : await getAllDocentes();
    return NextResponse.json(destinatarios);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
