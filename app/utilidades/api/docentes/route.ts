import { NextResponse } from "next/server";
import { getAllDocentes } from "../../_lib/docentes";
import { requireDocenteApi } from "../../_lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const docentes = await getAllDocentes();
    return NextResponse.json(docentes);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
