import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';
import { guardarEncuesta, pasantesAEvaluar, validarEncuesta, type DatosEncuesta, type OrigenEncuesta } from '@/lib/encuestaImpacto';

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || ['secretaria', 'colaborador'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { beneficiario_id, espacio_id, ciclo_id, requiere_impacto = true } = data;

    if (!beneficiario_id || !espacio_id || !ciclo_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const consulta = async (texto: string, parametros: unknown[]) => (await sql.query(texto, parametros)) as any[];

    const inscrito = await sql`
      SELECT 1 FROM inscripciones_espacio WHERE espacio_id = ${espacio_id} AND beneficiario_id = ${beneficiario_id}
    `;
    if (inscrito.length === 0) {
      return NextResponse.json({ error: 'El beneficiario no está inscrito en ese espacio' }, { status: 400 });
    }

    const { pasantes } = await pasantesAEvaluar(consulta, Number(espacio_id), Number(beneficiario_id));
    const datos = data as DatosEncuesta;
    const errorValidacion = validarEncuesta(datos, pasantes, { requiereImpacto: !!requiere_impacto });
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 });
    }

    // Trazabilidad: quién llenó la encuesta. Si la llenó un pasante desde su cuenta (y no el
    // beneficiario por QR) el supervisor recibe un aviso (lib/notificaciones.ts).
    const origen: OrigenEncuesta = usuario.rol === 'estudiante' ? 'panel_pasante' : 'panel_docente';

    await guardarEncuesta(consulta, {
      beneficiarioId: Number(beneficiario_id),
      cicloId: Number(ciclo_id),
      espacioId: Number(espacio_id),
      origen,
      registradoPor: Number(usuario.id),
      datos: { ...datos, evaluaciones_pasantes: datos.evaluaciones_pasantes || {} },
      pasantes,
    });

    return NextResponse.json({ success: true, message: 'Encuesta enviada exitosamente' });
  } catch (error: any) {
    console.error('Encuesta error:', error);
    return NextResponse.json(
      { error: 'Error guardando la encuesta', details: error.message },
      { status: 500 }
    );
  }
}
