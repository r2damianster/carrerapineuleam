import { NextRequest, NextResponse } from "next/server";
import { actualizarModalidad } from "../../../../../_lib/titulacionLogic";
import { requireDocenteApi } from "../../../../../_lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const datos = await request.json();
    const modalidadId = datos.modalidad_id;
    const rubricaId = datos.rubrica_id;
    if (!modalidadId || !rubricaId) {
      return NextResponse.json({ error: "modalidad_id y rubrica_id son requeridos" }, { status: 400 });
    }
    await actualizarModalidad(Number(params.id), Number(modalidadId), Number(rubricaId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
