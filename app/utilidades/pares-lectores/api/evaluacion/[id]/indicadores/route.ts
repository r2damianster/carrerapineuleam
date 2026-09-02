import { NextRequest, NextResponse } from "next/server";
import { guardarIndicadores } from "../../../../../_lib/titulacionLogic";
import { requireDocenteApi } from "../../../../../_lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const indicadores = await request.json();
    await guardarIndicadores(Number(params.id), Array.isArray(indicadores) ? indicadores : []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
