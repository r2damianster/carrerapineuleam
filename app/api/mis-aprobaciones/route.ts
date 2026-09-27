import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';

export const dynamic = 'force-dynamic';

// Sesión 53 — eventos/podcasts donde este docente es "profesor responsable" y todavía están sin
// aprobar. Es la cola para quienes NO son supervisor de Vinculación (ver /vinculacion/supervisar
// para el circuito de podcasts de pasantes) — el mismo docente que se marcó como responsable
// al registrar (o al que otro lo marcó) puede aprobar aquí, incluida su propia autoaprobación.
export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !esDocente(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const usuarioId = Number(usuario.id);

    const pendientes = await sql`
      SELECT a.id, a.titulo, a.tipo, a.fecha, a.evidencia_url, a.categoria, v.id AS video_id, v.youtube_url
      FROM actividades_difusion a
      LEFT JOIN videos v ON v.actividad_difusion_id = a.id
      WHERE a.aprobado_sitio = false
        AND ${usuarioId} = ANY(a.profesores_responsables)
      ORDER BY a.fecha DESC, a.id DESC
    `;

    return NextResponse.json({ success: true, data: pendientes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
