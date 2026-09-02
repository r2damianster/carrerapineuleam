import { NextResponse } from "next/server";
import { listarModalidadesConRubricas } from "../../../_lib/titulacionLogic";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await listarModalidadesConRubricas());
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
