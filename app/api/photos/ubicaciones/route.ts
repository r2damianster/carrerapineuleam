// app/api/photos/ubicaciones/route.ts — WP4.3
// GET: catálogo de ubicaciones filtrado por alcance (admin→todas; líder→solo las suyas).
// PATCH: editar topes/config (solo admin de sitio).

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { puedeAdministrarSitio, proyectosGestionables } from '@/lib/permisosProyecto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(sesion)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const esAdmin = puedeAdministrarSitio(sesion);

    const gestionables = await proyectosGestionables(sql, sesion);
    const idsGestionables = gestionables.map(p => p.id);

    // Ubicaciones filtradas por alcance
    const ubicaciones = esAdmin
      ? await sql`
          SELECT fu.*, (
            SELECT count(*) FROM fotos f
            WHERE f.activo = true AND f.visibilidad = 'publicable' AND f.menores = 'no'
              AND fu.slug = ANY(f.ubicaciones)
          ) AS publicadas
          FROM fotos_ubicaciones fu
          WHERE fu.activo = true
          ORDER BY fu.orden ASC, fu.slug ASC
        `
      : await sql`
          SELECT fu.*, (
            SELECT count(*) FROM fotos f
            WHERE f.activo = true AND f.visibilidad = 'publicable' AND f.menores = 'no'
              AND fu.slug = ANY(f.ubicaciones)
          ) AS publicadas
          FROM fotos_ubicaciones fu
          WHERE fu.activo = true
            AND fu.solo_admin = false
            AND fu.proyecto_id = ANY(${idsGestionables}::text[])
          ORDER BY fu.orden ASC, fu.slug ASC
        `;

    return NextResponse.json({ proyectos: gestionables, ubicaciones });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!puedeAdministrarSitio(sesion)) {
      return NextResponse.json({ error: 'Solo administración del sitio puede editar topes.' }, { status: 403 });
    }

    const body = await request.json();
    const { slug, max_fotos, auto_origen, auto_cantidad, activo } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug requerido.' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Validaciones
    if (max_fotos !== undefined && (typeof max_fotos !== 'number' || max_fotos < 1 || max_fotos > 50)) {
      return NextResponse.json({ error: 'max_fotos debe estar entre 1 y 50.' }, { status: 400 });
    }
    if (auto_cantidad !== undefined && (typeof auto_cantidad !== 'number' || auto_cantidad < 0)) {
      return NextResponse.json({ error: 'auto_cantidad debe ser >= 0.' }, { status: 400 });
    }
    // Si viene auto_cantidad, verificar que no excede max_fotos actual/nuevo
    if (auto_cantidad !== undefined) {
      const [actual] = await sql`SELECT max_fotos FROM fotos_ubicaciones WHERE slug = ${slug}`;
      const maxEfectivo = max_fotos ?? actual?.max_fotos ?? 0;
      if (auto_cantidad > maxEfectivo) {
        return NextResponse.json({ error: `auto_cantidad (${auto_cantidad}) no puede superar max_fotos (${maxEfectivo}).` }, { status: 400 });
      }
    }
    if (auto_origen !== undefined && auto_origen !== null && !['podcast', 'evento'].includes(auto_origen)) {
      return NextResponse.json({ error: 'auto_origen debe ser "podcast", "evento" o null.' }, { status: 400 });
    }

    // Construir SET dinámico solo con los campos enviados
    const campos: Record<string, unknown> = {};
    if (max_fotos !== undefined)    campos['max_fotos']    = max_fotos;
    if (auto_origen !== undefined)  campos['auto_origen']  = auto_origen;
    if (auto_cantidad !== undefined) campos['auto_cantidad'] = auto_cantidad;
    if (activo !== undefined)       campos['activo']       = !!activo;

    if (Object.keys(campos).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 });
    }

    // UPDATE campo a campo (template literal de neon no admite SET dinámico genérico)
    if (campos['max_fotos'] !== undefined) {
      await sql`UPDATE fotos_ubicaciones SET max_fotos = ${campos['max_fotos'] as number} WHERE slug = ${slug}`;
    }
    if (campos['auto_origen'] !== undefined) {
      await sql`UPDATE fotos_ubicaciones SET auto_origen = ${campos['auto_origen'] as string | null} WHERE slug = ${slug}`;
    }
    if (campos['auto_cantidad'] !== undefined) {
      await sql`UPDATE fotos_ubicaciones SET auto_cantidad = ${campos['auto_cantidad'] as number} WHERE slug = ${slug}`;
    }
    if (campos['activo'] !== undefined) {
      await sql`UPDATE fotos_ubicaciones SET activo = ${campos['activo'] as boolean} WHERE slug = ${slug}`;
    }

    const [actualizado] = await sql`SELECT * FROM fotos_ubicaciones WHERE slug = ${slug}`;
    return NextResponse.json(actualizado);
  } catch (error: any) {
    if (error.code === '23514') {
      return NextResponse.json({ error: 'El valor viola una restricción (ej: auto_cantidad > max_fotos).' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
