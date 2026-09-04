import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireInvestigacionApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const usuario = await requireInvestigacionApi();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const historial = await sql`
    SELECT id, periodo_desde, periodo_hasta,
      array_length(actividades_ids, 1) AS n_actividades,
      array_length(publicaciones_ids, 1) AS n_publicaciones,
      array_length(podcasts_ids, 1) AS n_podcasts,
      generado_en
    FROM informes_mensuales_generados
    WHERE usuario_id = ${Number(usuario.id)}
    ORDER BY generado_en DESC
    LIMIT 20
  `;

  return NextResponse.json({ historial });
}
