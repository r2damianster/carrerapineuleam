import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { calcularAvanceMetas, cicloVigenteId } from '@/lib/investigacionAportes';

// Resumen del avance de metas de TODOS los proyectos de Investigación, para el Dashboard PINE
// (visible a todo docente, igual que el resto de indicadores). Por defecto, el ciclo vigente.
export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !esDocente(usuario)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const cicloSolicitado = new URL(request.url).searchParams.get('ciclo_id');
    const cicloId = cicloSolicitado ? Number(cicloSolicitado) : await cicloVigenteId(sql);

    const proyectos = await sql`SELECT id, nombre_oficial FROM proyectos WHERE area = 'investigacion' AND activo = true ORDER BY nombre_oficial`;
    const resumen = [];
    for (const proyecto of proyectos) {
      resumen.push({ id: proyecto.id, nombre_oficial: proyecto.nombre_oficial, avance: await calcularAvanceMetas(sql, proyecto.id, cicloId) });
    }
    return NextResponse.json({ success: true, ciclo_id: cicloId, proyectos: resumen });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
