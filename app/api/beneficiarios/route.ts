import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacioIdParam = searchParams.get('espacio_id');

    const sql = neon(process.env.DATABASE_URL!);

    // Con espacio_id: solo los beneficiarios inscritos en ese espacio (requiere
    // ser profesor de vinculación o instructor de ese espacio). Sin espacio_id:
    // lista global (uso del profesor).
    const beneficiarios = espacioIdParam
      ? await (async () => {
          const espacio_id = parseInt(espacioIdParam);
          if (!(await puedeOperarEspacio(usuario, espacio_id))) {
            return null;
          }
          return sql`
            SELECT u.id, u.nombres, u.apellidos
            FROM inscripciones_espacio ie
            JOIN usuarios u ON ie.beneficiario_id = u.id
            WHERE ie.espacio_id = ${espacio_id}
            ORDER BY u.nombres ASC
          `;
        })()
      : await sql`
          SELECT id, nombres, apellidos
          FROM usuarios
          WHERE rol = 'beneficiario'
          ORDER BY nombres ASC
        `;

    if (beneficiarios === null) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: beneficiarios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
