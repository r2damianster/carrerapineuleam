import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarProyecto } from '@/lib/permisosProyecto';
import { calcularAvanceMetas, cicloVigenteId } from '@/lib/investigacionAportes';

// Avance de metas del proyecto en un ciclo (por defecto, el vigente). Líder/colíder o administración del sitio.
export async function GET(request: Request, { params }: { params: { proyectoId: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    if (!(await puedeGestionarProyecto(sql, usuario, params.proyectoId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const cicloSolicitado = new URL(request.url).searchParams.get('ciclo_id');
    const cicloId = cicloSolicitado ? Number(cicloSolicitado) : await cicloVigenteId(sql);
    const ciclos = await sql`SELECT id, nombre FROM ciclos_academicos ORDER BY fecha_inicio DESC`;
    const avance = await calcularAvanceMetas(sql, params.proyectoId, cicloId);
    return NextResponse.json({ success: true, ciclos, avance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
