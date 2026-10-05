import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { pasantesAEvaluar, type PasanteAEvaluar } from '@/lib/encuestaImpacto';

// Público (sin sesión) — valida un token y dice qué formulario mostrar.
// No expone nada sensible: solo el nombre del espacio y, en postest, el
// nombre del beneficiario (para saludarlo por su nombre).
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const rows = await sql`
      SELECT
        el.tipo, el.test_tipo, el.expira_en, el.max_usos, el.usos_actuales, el.espacio_id, el.beneficiario_id,
        esp.nombre AS espacio_nombre,
        b.nombres AS beneficiario_nombres, b.apellidos AS beneficiario_apellidos
      FROM enlaces_evaluacion el
      JOIN espacios_enseñanza esp ON esp.id = el.espacio_id
      LEFT JOIN usuarios b ON b.id = el.beneficiario_id
      WHERE el.token = ${params.token}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }

    const enlace = rows[0];
    const expirado = new Date(enlace.expira_en).getTime() <= Date.now();
    const agotado = enlace.max_usos !== null && enlace.usos_actuales >= enlace.max_usos;

    if (expirado || agotado) {
      return NextResponse.json({ error: 'Este enlace ya no está disponible' }, { status: 410 });
    }

    // El postest de MCER siempre trae la encuesta de satisfacción en el mismo formulario.
    // El beneficiario califica solo a los pasantes con los que realmente trabajó.
    let pasantes: PasanteAEvaluar[] = [];
    let porCoincidencia = false;
    if (enlace.test_tipo === 'encuesta' || (enlace.tipo === 'postest' && enlace.test_tipo === 'mcer')) {
      const consulta = async (texto: string, parametros: unknown[]) => (await sql.query(texto, parametros)) as any[];
      ({ pasantes, porCoincidencia } = await pasantesAEvaluar(consulta, enlace.espacio_id, enlace.beneficiario_id));
    }

    return NextResponse.json({
      success: true,
      data: {
        tipo: enlace.tipo,
        test_tipo: enlace.test_tipo,
        espacio_nombre: enlace.espacio_nombre,
        beneficiario_nombre: enlace.beneficiario_nombres
          ? `${enlace.beneficiario_nombres} ${enlace.beneficiario_apellidos}`
          : null,
        pasantes,
        porCoincidencia,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
