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

  const [actividadesDifusion, publicaciones, podcasts, actividadesPasantes] = await Promise.all([
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
    // Actividades de investigación de pasantes de Vinculación, aprobadas por su supervisor,
    // que aportan a un proyecto donde este docente es miembro activo.
    sql`
      SELECT a.id, a.fecha, a.descripcion, a.horas::float AS horas, u.nombres, u.apellidos,
             COALESCE(py.nombre_oficial, 'Proyecto sin asignar') AS proyecto_nombre
      FROM actividades_investigacion_pasante a
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN proyectos py ON py.id = a.proyecto_id
      WHERE a.estado_aprobacion = 'aprobado' AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
        AND a.proyecto_id IN (SELECT pm.proyecto_id FROM proyecto_miembros pm WHERE pm.usuario_id = ${usuarioId} AND pm.activo)
      ORDER BY a.fecha, a.id
    `,
  ]);

  // Se mezclan en la lista de actividades con id negativo (no choca con actividades_difusion.id)
  // para que el usuario las pueda marcar/desmarcar igual que el resto.
  const actividades = [
    ...actividadesDifusion,
    ...actividadesPasantes.map((actividad: any) => ({
      id: -actividad.id,
      titulo: `Investigación estudiantil — ${actividad.nombres} ${actividad.apellidos} (${actividad.proyecto_nombre})`,
      tipo: 'investigacion_estudiantil',
      categoria: 'investigacion',
      fecha: actividad.fecha,
      descripcion: `${actividad.descripcion} [${actividad.horas} h]`,
    })),
  ];

  return NextResponse.json({ actividades, publicaciones, podcasts });
}
