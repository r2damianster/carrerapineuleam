import { NextRequest, NextResponse } from "next/server";
import { obtenerEvaluacion } from "../../../../_lib/titulacionLogic";
import { requireDocenteApi } from "../../../../_lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const evaluacion = await obtenerEvaluacion(Number(params.id));
    if (!evaluacion) return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
    return NextResponse.json(evaluacion);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
