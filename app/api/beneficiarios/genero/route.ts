import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeSupervisarVinculacion } from '@/lib/modulos';

const GENEROS_VALIDOS = ['femenino', 'masculino', 'otro', 'prefiero_no_decir'];

export async function PATCH(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const updates: { id: number; genero: string }[] = body.updates || body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Se requiere una lista de actualizaciones [{id, genero}]' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    let actualizados = 0;

    for (const item of updates) {
      if (!item.id || !item.genero || !GENEROS_VALIDOS.includes(item.genero)) {
        continue;
      }
      await sql`
        UPDATE usuarios 
        SET genero = ${item.genero} 
        WHERE id = ${item.id} AND rol = 'beneficiario'
      `;
      actualizados++;
    }

    return NextResponse.json({ success: true, updated: actualizados });
  } catch (error: any) {
    console.error('Error actualizando género de beneficiarios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
