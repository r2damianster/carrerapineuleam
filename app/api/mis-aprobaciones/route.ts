import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { proyectosQueLidera } from '@/lib/permisosAprobacionContenido';

export const dynamic = 'force-dynamic';

// Sesión 53/60 — eventos/podcasts sin aprobar que este docente puede aprobar: donde es "profesor
// responsable" o donde es líder/colíder de alguno de los proyectos del registro. Es la cola para
// quienes NO son supervisor de Vinculación (ver /vinculacion/supervisar para el circuito de
// podcasts de pasantes). Se muestra mientras siga pendiente, sin umbral de antigüedad.
export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !esDocente(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const usuarioId = Number(usuario.id);
    const proyectosLiderados = await proyectosQueLidera(sql, usuarioId);

    const pendientes = await sql`
      SELECT a.id, a.titulo, a.tipo, a.fecha, a.evidencia_url, a.categoria, a.proyectos, v.id AS video_id, v.youtube_url
      FROM actividades_difusion a
      LEFT JOIN videos v ON v.actividad_difusion_id = a.id
      WHERE a.aprobado_sitio = false
        AND (${usuarioId} = ANY(a.profesores_responsables) OR a.proyectos && ${proyectosLiderados}::text[])
      ORDER BY a.fecha DESC, a.id DESC
    `;

    return NextResponse.json({ success: true, data: pendientes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
