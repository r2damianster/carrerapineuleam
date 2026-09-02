import { NextRequest, NextResponse } from "next/server";
import { guardarObservaciones } from "../../../../../_lib/titulacionLogic";
import { requireDocenteApi } from "../../../../../_lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const observaciones = await request.json();
    await guardarObservaciones(Number(params.id), Array.isArray(observaciones) ? observaciones : []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
