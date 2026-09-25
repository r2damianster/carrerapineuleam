import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacioId = searchParams.get('espacio_id');
    if (!espacioId) {
      return NextResponse.json({ success: true, actividades: [] });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [espacio] = await sql`
      SELECT id, ciclo_id FROM "espacios_enseñanza" WHERE id = ${parseInt(espacioId)}
    `;

    if (!espacio) {
      return NextResponse.json({ success: true, actividades: [] });
    }

    const actividades = await sql`
      SELECT id, descripcion, metodologia, espacio_id
      FROM proyecto_actividades_plan
      WHERE ciclo_id = ${espacio.ciclo_id}
        AND activo = true
        AND (espacio_id IS NULL OR espacio_id = ${espacio.id})
      ORDER BY id ASC
    `;

    return NextResponse.json({ success: true, actividades });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
