import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';
import { pasantesAEvaluar } from '@/lib/encuestaImpacto';

export const dynamic = 'force-dynamic';

// Pasantes que el beneficiario puede calificar en la encuesta: solo los que coincidieron con
// él en alguna sesión. Mismo criterio que usa el POST de /api/encuestas para validar.
export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacioId = Number(searchParams.get('espacio_id'));
    const beneficiarioId = Number(searchParams.get('beneficiario_id'));
    if (!espacioId || !beneficiarioId) {
      return NextResponse.json({ error: 'Faltan espacio_id y beneficiario_id' }, { status: 400 });
    }
    if (!(await puedeOperarEspacio(usuario, espacioId))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const consulta = async (texto: string, parametros: unknown[]) => (await sql.query(texto, parametros)) as any[];
    const resultado = await pasantesAEvaluar(consulta, espacioId, beneficiarioId);
    return NextResponse.json({ success: true, data: resultado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
