import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireInvestigacionApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const usuario = await requireInvestigacionApi();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (!desde || !hasta) {
    return NextResponse.json({ error: "Faltan parámetros desde/hasta" }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const usuarioId = Number(usuario.id);

  const [actividades, publicaciones, podcasts] = await Promise.all([
    sql`
      SELECT id, titulo, tipo, categoria, fecha, descripcion
      FROM actividades_difusion
      WHERE fecha BETWEEN ${desde} AND ${hasta}
        AND ${usuarioId} = ANY(profesores_responsables)
      ORDER BY fecha
    `,
    sql`
      SELECT id, title, authors, type, category, publication_date, doi_link, created
      FROM publications
      WHERE created >= ${desde}::date AND created < (${hasta}::date + INTERVAL '1 day')
      ORDER BY created
    `,
    sql`
      SELECT id, title, description, category, tags, published_date, created
      FROM videos
      WHERE created >= ${desde}::date AND created < (${hasta}::date + INTERVAL '1 day')
      ORDER BY created
    `,
  ]);

  return NextResponse.json({ actividades, publicaciones, podcasts });
}
