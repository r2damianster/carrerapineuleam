// app/api/photos/banco/route.ts — WP4.1
// Listado paginado y filtrado del banco de fotos para admin/líderes.
// Solo acceso autenticado; el alcance varía por rol.

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { puedeAdministrarSitio, proyectosGestionables } from '@/lib/permisosProyecto';
import { miniaturaCloudinary } from '@/lib/cloudinaryUrl';

export const dynamic = 'force-dynamic';

const ORIGENES_VALIDOS  = ['admin', 'evidencia_evento', 'evento', 'podcast', 'asistencia', 'lider'] as const;
const MENORES_VALIDOS   = ['no', 'si', 'revisar'] as const;
const PAGE_SIZE_MAX     = 60;
const PAGE_SIZE_DEFAULT = 24;

export async function GET(request: Request) {
  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(sesion)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const esAdmin = puedeAdministrarSitio(sesion);

    // ── Determinar alcance de proyectos para no-admin ──────────────────────
    let idsProyectosPermitidos: string[] = [];
    if (!esAdmin) {
      const gestionables = await proyectosGestionables(sql, sesion);
      if (gestionables.length === 0) {
        return NextResponse.json({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE_DEFAULT });
      }
      idsProyectosPermitidos = gestionables.map(p => p.id);
    }

    // ── Parámetros de consulta ─────────────────────────────────────────────
    const { searchParams } = new URL(request.url);

    const q          = (searchParams.get('q') ?? '').trim().slice(0, 200);
    const origenRaw  = searchParams.get('origen') ?? '';
    const ubicacion  = (searchParams.get('ubicacion') ?? '').trim().slice(0, 100);
    const proyectoFiltro = (searchParams.get('proyecto') ?? '').trim().slice(0, 100);
    const desde      = searchParams.get('desde') ?? '';
    const hasta      = searchParams.get('hasta') ?? '';
    const menoresRaw = searchParams.get('menores') ?? '';
    const estadoRaw  = searchParams.get('estado') ?? '';
    const pageRaw    = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSizeRaw= parseInt(searchParams.get('pageSize') ?? String(PAGE_SIZE_DEFAULT), 10);

    const page     = Math.max(1, isNaN(pageRaw) ? 1 : pageRaw);
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, isNaN(pageSizeRaw) ? PAGE_SIZE_DEFAULT : pageSizeRaw));
    const offset   = (page - 1) * pageSize;

    const origen  = (ORIGENES_VALIDOS as readonly string[]).includes(origenRaw) ? origenRaw : null;
    const menores = (MENORES_VALIDOS as readonly string[]).includes(menoresRaw) ? menoresRaw : null;

    // ── Construir WHERE dinámicamente ─────────────────────────────────────
    // Se usa SQL paramétrico; nunca interpolación de strings de usuario.
    // Para no-admin: solo fotos de sus proyectos + publicable + sin menores + fuente aprobada.
    const whereBase = esAdmin
      ? sql`1=1`
      : sql`
          proyectos && ${idsProyectosPermitidos}::text[]
          AND visibilidad = 'publicable'
          AND menores = 'no'
          AND (
            origen IN ('admin', 'lider', 'evidencia_evento')
            OR (
              origen IN ('evento', 'podcast')
              AND EXISTS (
                SELECT 1 FROM actividades_difusion a
                WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true
              )
            )
            OR (
              origen = 'asistencia'
              AND EXISTS (
                SELECT 1 FROM asistencia_espacio s
                WHERE s.id::text = fotos.fuente_id AND s.estado_aprobacion = 'aprobado'
              )
            )
          )
        `;

    // Búsqueda por texto
    const whereTexto = q ? sql`AND (titulo ILIKE ${`%${q}%`} OR descripcion ILIKE ${`%${q}%`})` : sql``;

    // Filtro origen
    const whereOrigen = origen ? sql`AND origen = ${origen}` : sql``;

    // Filtro ubicación
    const whereUbicacion = ubicacion === 'sin_ubicar'
      ? sql`AND cardinality(ubicaciones) = 0`
      : ubicacion
        ? sql`AND ${ubicacion} = ANY(ubicaciones)`
        : sql``;

    // Filtro proyecto (solo admin puede filtrar por proyecto_id externo)
    const whereProyecto = esAdmin && proyectoFiltro === 'sin_proyecto'
      ? sql`AND cardinality(proyectos) = 0`
      : esAdmin && proyectoFiltro
        ? sql`AND ${proyectoFiltro} = ANY(proyectos)`
        : !esAdmin && proyectoFiltro && idsProyectosPermitidos.includes(proyectoFiltro)
          ? sql`AND ${proyectoFiltro} = ANY(proyectos)`
          : sql``;

    // Filtro fechas
    const whereDede = desde ? sql`AND COALESCE(fecha_evento, created::date) >= ${desde}::date` : sql``;
    const whereHasta = hasta ? sql`AND COALESCE(fecha_evento, created::date) <= ${hasta}::date` : sql``;

    // Filtro menores (solo admin puede ver 'si'/'revisar')
    const whereMenores = esAdmin && menores ? sql`AND menores = ${menores}` : sql``;

    // Filtro estado (publicada | sin_ubicar | oculta)
    // Las descartadas solo aparecen con estado=descartada (para poder restaurarlas); en cualquier otro
    // listado se excluyen. "Descartar" no borra nada: la foto sigue en el banco pero inutilizable.
    const whereEstado = estadoRaw === 'descartada'
      ? sql`AND descartada = true`
      : estadoRaw === 'publicada'
        ? sql`AND descartada = false AND activo = true AND cardinality(ubicaciones) > 0`
        : estadoRaw === 'sin_ubicar'
          ? sql`AND descartada = false AND cardinality(ubicaciones) = 0`
          : estadoRaw === 'oculta'
            ? sql`AND descartada = false AND activo = false`
            : sql`AND descartada = false`;

    // ── Conteo total ──────────────────────────────────────────────────────
    const [{ count: total }] = await sql`
      SELECT count(*) FROM fotos
      WHERE ${whereBase}
        ${whereTexto}
        ${whereOrigen}
        ${whereUbicacion}
        ${whereProyecto}
        ${whereDede}
        ${whereHasta}
        ${whereMenores}
        ${whereEstado}
    `;

    // ── Página de resultados ──────────────────────────────────────────────
    const rows = await sql`
      SELECT fotos.*,
        (
          origen IN ('admin', 'lider', 'evidencia_evento')
          OR (origen IN ('evento', 'podcast') AND EXISTS (
            SELECT 1 FROM actividades_difusion a WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true))
          OR (origen = 'asistencia' AND EXISTS (
            SELECT 1 FROM asistencia_espacio s WHERE s.id::text = fotos.fuente_id AND s.estado_aprobacion = 'aprobado'))
        ) AS fuente_aprobada
      FROM fotos
      WHERE ${whereBase}
        ${whereTexto}
        ${whereOrigen}
        ${whereUbicacion}
        ${whereProyecto}
        ${whereDede}
        ${whereHasta}
        ${whereMenores}
        ${whereEstado}
      ORDER BY created DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const items = rows.map((f: any) => ({
      ...f,
      miniatura: miniaturaCloudinary(f.url, 400),
    }));

    return NextResponse.json({ items, total: Number(total), page, pageSize });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
