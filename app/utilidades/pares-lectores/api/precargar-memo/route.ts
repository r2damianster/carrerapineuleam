import { NextRequest, NextResponse } from "next/server";
import { extraerTexto } from "../../../_lib/extraerTexto";
import { precargarDatosMemo } from "../../../_lib/titulacionIa";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const archivoMemo = form.get("archivo_memo");
    const archivoTrabajo = form.get("archivo_trabajo");
    const memoValido = archivoMemo instanceof File && archivoMemo.size > 0;
    const trabajoValido = archivoTrabajo instanceof File && archivoTrabajo.size > 0;
    if (!memoValido && !trabajoValido) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    const [textoMemo, textoTrabajo] = await Promise.all([
      memoValido
        ? extraerTexto(archivoMemo.name, Buffer.from(await archivoMemo.arrayBuffer()))
        : Promise.resolve(""),
      trabajoValido
        ? extraerTexto(archivoTrabajo.name, Buffer.from(await archivoTrabajo.arrayBuffer()))
        : Promise.resolve(""),
    ]);

    const [datos, error] = await precargarDatosMemo(textoMemo, textoTrabajo);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(datos);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
