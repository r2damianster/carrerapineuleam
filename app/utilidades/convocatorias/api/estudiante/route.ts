import { NextRequest, NextResponse } from "next/server";
import { renderizarPlantilla } from "../../../_lib/docxtemplater";
import { formatearFechaLarga } from "../../../_lib/fechas";
import { construirDestinatarios, consolidarEstudiantes, type GrupoConvocado } from "../../../_lib/convocatorias";
import { respuestaDocx } from "../../../_lib/respuestaArchivo";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const campo = (nombre: string) => (form.get(nombre)?.toString() ?? "").trim();
    const grupos = JSON.parse(campo("grupos_json") || "[]") as GrupoConvocado[];
    if (!Array.isArray(grupos) || grupos.length === 0) {
      return NextResponse.json({ error: "Agregue al menos una lista de estudiantes." }, { status: 400 });
    }
    if (grupos.some((g) => !g.carrera?.trim())) {
      return NextResponse.json({ error: "Cada lista debe tener carrera asignada." }, { status: 400 });
    }

    const contexto: Record<string, string> = {
      NUM_CONVOCATORIA: campo("num_convocatoria"),
      PERIODO: campo("periodo"),
      SIGLAS_CONVOCANTE: "PINE",
      CIUDAD: campo("ciudad"),
      FECHA_LARGA: formatearFechaLarga(campo("fecha_larga")),
      ASUNTO: campo("asunto"),
      DESTINATARIOS: construirDestinatarios(grupos),
      DESCRIPCION_CONVOCATORIA: campo("descripcion_convocatoria"),
      FECHA_REUNION: formatearFechaLarga(campo("fecha_reunion")),
      HORA_REUNION: campo("hora_reunion"),
      LUGAR_REUNION: campo("lugar_reunion"),
      CONVOCANTE_TITULO: campo("convocante_titulo"),
      CONVOCANTE_NOMBRE: campo("convocante_nombre"),
      CONVOCANTE_CARGO: campo("convocante_cargo"),
      INICIALES_ELABORADOR: campo("iniciales_elaborador"),
    };

    const { nombres } = consolidarEstudiantes(grupos);

    const buffer = renderizarPlantilla("utilidades-convocatoria-estudiantes.docx", {
      ...contexto,
      estudiantes: nombres.map((nombre) => ({ nombre })),
    });

    return respuestaDocx(buffer, "Convocatoria_Estudiantes.docx");
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
