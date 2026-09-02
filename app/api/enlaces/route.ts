import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

// Genera un enlace/QR público (sin login) para que un beneficiario tome el
// test MCER o la encuesta de satisfacción directamente desde su celular.
// - pretest: sin beneficiario_id (aún no existe), reutilizable dentro de la
//   ventana de expiración por todo el grupo (max_usos NULL).
// - postest: ligado a un beneficiario_id ya inscrito, un solo uso.
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { espacio_id, tipo, test_tipo, beneficiario_id, ciclo_id, expira_en } = await request.json();

    if (!espacio_id || !tipo || !test_tipo || !expira_en) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!['pretest', 'postest'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    if (!['mcer', 'encuesta'].includes(test_tipo)) {
      return NextResponse.json({ error: 'test_tipo inválido' }, { status: 400 });
    }
    if (tipo === 'postest' && !beneficiario_id) {
      return NextResponse.json({ error: 'El postest requiere un beneficiario' }, { status: 400 });
    }
    if (test_tipo === 'encuesta' && !ciclo_id) {
      return NextResponse.json({ error: 'La encuesta requiere un ciclo académico' }, { status: 400 });
    }
    if (new Date(expira_en).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'La fecha de expiración debe ser futura' }, { status: 400 });
    }

    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    if (tipo === 'postest') {
      const inscrito = await sql`
        SELECT 1 FROM inscripciones_espacio WHERE espacio_id = ${espacio_id} AND beneficiario_id = ${beneficiario_id}
      `;
      if (inscrito.length === 0) {
        return NextResponse.json({ error: 'El beneficiario no está inscrito en ese espacio' }, { status: 400 });
      }
    }

    const maxUsos = tipo === 'postest' ? 1 : null;

    const [enlace] = await sql`
      INSERT INTO enlaces_evaluacion (tipo, test_tipo, espacio_id, beneficiario_id, ciclo_id, creado_por, expira_en, max_usos)
      VALUES (${tipo}, ${test_tipo}, ${espacio_id}, ${tipo === 'postest' ? beneficiario_id : null}, ${ciclo_id || null}, ${usuario.id}, ${expira_en}, ${maxUsos})
      RETURNING token
    `;

    return NextResponse.json({ success: true, data: { token: enlace.token } }, { status: 201 });
  } catch (error: any) {
    console.error('Enlace create error:', error);
    return NextResponse.json({ error: 'Error generando el enlace', details: error.message }, { status: 500 });
  }
}
