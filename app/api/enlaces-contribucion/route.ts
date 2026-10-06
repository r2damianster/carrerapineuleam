import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGenerarEnlaceContribucion } from '@/lib/permisos-enlace-contribucion';
import { TIPOS_PUBLICACION, MAX_AUTORES } from '@/lib/enlaceContribucion';

// Genera un enlace/QR público (sin login) para que alguien sin cuenta envíe una contribución
// académica. Solo un docente. Lo que llegue por este enlace nace SIEMPRE pendiente de
// aprobación (aprobada=false, forzado en POST /api/enlaces-contribucion/[token]).
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGenerarEnlaceContribucion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombre_invitado, tipo_publicacion, docente_es_autor, docente_orden, expira_en, uso_unico } = await request.json();

    if (!nombre_invitado || !String(nombre_invitado).trim() || !expira_en) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!TIPOS_PUBLICACION.includes(tipo_publicacion)) {
      return NextResponse.json({ error: 'Debe indicar qué tipo de contribución recibirá el enlace' }, { status: 400 });
    }
    if (new Date(expira_en).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'La fecha de expiración debe ser futura' }, { status: 400 });
    }

    const esAutor = docente_es_autor === true;
    let orden: number | null = null;
    if (esAutor) {
      orden = Number(docente_orden);
      if (!Number.isInteger(orden) || orden < 1 || orden > MAX_AUTORES) {
        return NextResponse.json({ error: `Tu orden de autoría debe ser un número entre 1 y ${MAX_AUTORES}` }, { status: 400 });
      }
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [enlace] = await sql`
      INSERT INTO enlaces_contribucion (creado_por, nombre_invitado, tipo_publicacion, docente_es_autor, docente_orden, expira_en, max_usos)
      VALUES (${Number(usuario.id)}, ${String(nombre_invitado).trim()}, ${tipo_publicacion}, ${esAutor}, ${orden}, ${expira_en}, ${uso_unico ? 1 : null})
      RETURNING token
    `;

    return NextResponse.json({ success: true, data: { token: enlace.token } }, { status: 201 });
  } catch (error: any) {
    console.error('Enlace contribución create error:', error);
    return NextResponse.json({ error: 'Error generando el enlace', details: error.message }, { status: 500 });
  }
}

// Lista los enlaces generados por el usuario actual (admin ve todos).
export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGenerarEnlaceContribucion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const verTodos = usuario.modulos_acceso.includes('admin') || usuario.modulos_acceso.includes('superadmin');
    const filas = verTodos
      ? await sql`
          SELECT el.token, el.nombre_invitado, el.tipo_publicacion, el.docente_es_autor, el.docente_orden,
                 el.expira_en, el.max_usos, el.usos_actuales, el.activo, el.creado_en,
                 u.nombres AS creado_por_nombres, u.apellidos AS creado_por_apellidos
          FROM enlaces_contribucion el
          JOIN usuarios u ON u.id = el.creado_por
          ORDER BY el.creado_en DESC
        `
      : await sql`
          SELECT token, nombre_invitado, tipo_publicacion, docente_es_autor, docente_orden,
                 expira_en, max_usos, usos_actuales, activo, creado_en
          FROM enlaces_contribucion
          WHERE creado_por = ${Number(usuario.id)}
          ORDER BY creado_en DESC
        `;
    return NextResponse.json({ success: true, data: filas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
