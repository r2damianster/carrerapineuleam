import { NextRequest, NextResponse } from "next/server";
import { crearEvaluacion, obtenerEvaluacion } from "../../../_lib/titulacionLogic";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const datos = await request.json();
    const evaluacionId = await crearEvaluacion(datos);
    const evaluacion = await obtenerEvaluacion(evaluacionId);
    return NextResponse.json({ evaluacion_id: evaluacionId, fecha_limite: evaluacion?.fecha_limite ?? null });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
