import { NextRequest, NextResponse } from "next/server";
import { crearContactoExterno, eliminarContactoExterno, listarContactosExternos } from "../../_lib/docentes";
import { requireDocenteApi } from "../../_lib/auth";

export const runtime = "nodejs";

function noAutorizado() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  if (!(await requireDocenteApi())) return noAutorizado();
  try {
    return NextResponse.json(await listarContactosExternos());
  } catch (error) {
    return NextResponse.json({ error: mensajeDeError(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireDocenteApi())) return noAutorizado();
  try {
    const cuerpo = await request.json();
    const campo = (nombre: string) => String(cuerpo?.[nombre] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    const datos = {
      titulo_grado: campo("titulo_grado"),
      nombres: campo("nombres"),
      apellidos: campo("apellidos"),
      post_grado: campo("post_grado"),
      cargo: campo("cargo"),
      dependencia: campo("dependencia"),
    };
    const faltantes = (["nombres", "apellidos", "cargo", "dependencia"] as const).filter((nombre) => !datos[nombre]);
    if (faltantes.length > 0) {
      return NextResponse.json({ error: `Faltan campos: ${faltantes.join(", ")}` }, { status: 400 });
    }
    const id = await crearContactoExterno(datos);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: mensajeDeError(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireDocenteApi())) return noAutorizado();
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  try {
    const eliminado = await eliminarContactoExterno(id);
    if (!eliminado) {
      return NextResponse.json({ error: "Solo se pueden eliminar contactos creados desde el directorio" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Normalmente una FK: el contacto ya está referenciado por otro registro.
    return NextResponse.json({ error: mensajeDeError(error) }, { status: 409 });
  }
}
