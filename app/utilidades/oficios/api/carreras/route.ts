import { NextResponse } from "next/server";
import { getAllCarreras } from "../../../_lib/docentes";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const carreras = await getAllCarreras();
    return NextResponse.json(carreras);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
