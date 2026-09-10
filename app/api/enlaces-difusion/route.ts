import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGenerarEnlaceDifusion } from '@/lib/permisos-enlace-difusion';

// Genera un enlace/QR público (sin login) para que alguien sin cuenta en el
// Portal registre un evento/podcast en actividades_difusion — siempre
// pendiente de aprobación (aprobado_sitio=false, forzado en
// POST /api/enlaces-difusion/[token], nunca aquí). Ver
// lib/permisos-enlace-difusion.ts para quién puede generarlo.
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGenerarEnlaceDifusion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombre_invitado, expira_en, uso_unico } = await request.json();

    if (!nombre_invitado || !expira_en) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (new Date(expira_en).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'La fecha de expiración debe ser futura' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [enlace] = await sql`
      INSERT INTO enlaces_difusion (creado_por, nombre_invitado, expira_en, max_usos)
      VALUES (${Number(usuario.id)}, ${nombre_invitado}, ${expira_en}, ${uso_unico ? 1 : null})
      RETURNING token
    `;

    return NextResponse.json({ success: true, data: { token: enlace.token } }, { status: 201 });
  } catch (error: any) {
    console.error('Enlace difusión create error:', error);
    return NextResponse.json({ error: 'Error generando el enlace', details: error.message }, { status: 500 });
  }
}

// Lista los enlaces generados por el usuario actual (o todos si tiene
// contenido_sitio) — para el panel de "enlaces activos" con opción a revocar.
export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGenerarEnlaceDifusion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const verTodos = usuario.modulos_acceso.includes('contenido_sitio');
    const rows = verTodos
      ? await sql`
          SELECT el.token, el.nombre_invitado, el.expira_en, el.max_usos, el.usos_actuales, el.activo, el.creado_en,
                 u.nombres AS creado_por_nombres, u.apellidos AS creado_por_apellidos
          FROM enlaces_difusion el
          JOIN usuarios u ON u.id = el.creado_por
          ORDER BY el.creado_en DESC
        `
      : await sql`
          SELECT token, nombre_invitado, expira_en, max_usos, usos_actuales, activo, creado_en
          FROM enlaces_difusion
          WHERE creado_por = ${Number(usuario.id)}
          ORDER BY creado_en DESC
        `;

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
