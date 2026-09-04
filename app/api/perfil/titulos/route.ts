import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { GRADOS_TERCER_NIVEL, GRADOS_CUARTO_NIVEL } from '@/lib/gradosCatalogo';
import { sincronizarTitulos } from '@/lib/perfilSync';

const NIVELES_VALIDOS = ['tercer_nivel', 'cuarto_nivel'];

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { nivel, tipo, titulo_especifico, institucion, anio, es_principal } = await request.json();
    if (!NIVELES_VALIDOS.includes(nivel)) {
      return NextResponse.json({ error: 'Nivel no válido' }, { status: 400 });
    }
    const catalogo: readonly string[] = nivel === 'tercer_nivel' ? GRADOS_TERCER_NIVEL : GRADOS_CUARTO_NIVEL;
    if (!catalogo.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de título no válido' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = Number(usuario.id);

    if (es_principal) {
      await sql`
        UPDATE perfiles_titulos_academicos SET es_principal = false
        WHERE usuario_id = ${usuarioId} AND nivel = ${nivel}
      `;
    }

    const [nuevo] = await sql`
      INSERT INTO perfiles_titulos_academicos (usuario_id, nivel, tipo, titulo_especifico, institucion, anio, es_principal)
      VALUES (${usuarioId}, ${nivel}, ${tipo}, ${titulo_especifico || null}, ${institucion || null}, ${anio || null}, ${!!es_principal})
      RETURNING *
    `;

    await sincronizarTitulos(sql, usuarioId, usuario.email);
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
