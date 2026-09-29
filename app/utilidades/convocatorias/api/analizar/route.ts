import { NextRequest, NextResponse } from "next/server";
import { analizarListaEstudiantes, detectarRepetidosEntreArchivos } from "../../../_lib/listaEstudiantes";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

/** Lee las listas de estudiantes subidas y devuelve lo detectado para que el usuario lo revise antes de generar. */
export async function POST(request: NextRequest) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0);
    if (archivos.length === 0) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }
    const listas = [];
    for (const archivo of archivos) listas.push(await analizarListaEstudiantes(archivo));
    detectarRepetidosEntreArchivos(listas);
    return NextResponse.json({ listas });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
