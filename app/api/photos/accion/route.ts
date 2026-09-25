// app/api/photos/accion/route.ts — WP4.2
// Acciones en lote sobre fotos: publicar, quitar, ocultar, mostrar, descartar,
// marcar_revisada, marcar_interna.
//
// ATOMICIDAD: usa Pool + BEGIN/COMMIT. El driver neon() por defecto NO admite
// transacciones multi-statement (cada llamada es HTTP independiente).
// Si la validación falla para cualquier foto, se hace ROLLBACK y no se modifica nada.

import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { puedeAdministrarSitio, puedeGestionarProyecto, proyectosGestionables } from '@/lib/permisosProyecto';

export const dynamic = 'force-dynamic';

type Accion =
  | 'publicar'
  | 'quitar'
  | 'ocultar'
  | 'mostrar'
  | 'descartar'
  | 'marcar_revisada'
  | 'marcar_interna';

const ACCIONES_SOLO_ADMIN: Accion[] = ['marcar_revisada', 'marcar_interna'];

interface FotoRow {
  id: string;
  menores: string;
  visibilidad: string;
  ubicaciones: string[];
  proyectos: string[];
  origen: string;
  activo: boolean;
  fuente_id: string | null;
}

interface UbicacionRow {
  slug: string;
  proyecto_id: string | null;
  solo_admin: boolean;
  activo: boolean;
}

export async function POST(request: Request) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(sesion)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const body = await request.json();
    const { ids, accion, ubicaciones: ubicacionesPedidas = [] } = body;

    // ── Validación de input básico ─────────────────────────────────────────
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return NextResponse.json({ error: 'ids debe ser un arreglo de 1 a 100 elementos.' }, { status: 400 });
    }
    if (!ids.every((id: unknown) => typeof id === 'string')) {
      return NextResponse.json({ error: 'Todos los ids deben ser strings.' }, { status: 400 });
    }
    const idsUnicos: string[] = Array.from(new Set(ids as string[]));

    const ACCIONES_VALIDAS: Accion[] = ['publicar','quitar','ocultar','mostrar','descartar','marcar_revisada','marcar_interna'];
    if (!ACCIONES_VALIDAS.includes(accion as Accion)) {
      return NextResponse.json({ error: `acción inválida: ${accion}` }, { status: 400 });
    }

    const esAdmin = puedeAdministrarSitio(sesion);

    if (['publicar', 'quitar'].includes(accion) && (!Array.isArray(ubicacionesPedidas) || ubicacionesPedidas.length === 0)) {
      return NextResponse.json({ error: 'Indica al menos una ubicación para publicar o quitar.' }, { status: 400 });
    }

    // Solo admin puede hacer acciones exclusivas
    if (ACCIONES_SOLO_ADMIN.includes(accion as Accion) && !esAdmin) {
      return NextResponse.json({ error: 'Solo administración del sitio puede ejecutar esta acción.' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ── Cargar fotos ────────────────────────────────────────────────────
      const { rows: fotosRaw } = await client.query<FotoRow>(
        `SELECT id, menores, visibilidad, ubicaciones, proyectos, origen, activo, fuente_id
         FROM fotos WHERE id = ANY($1)`,
        [idsUnicos]
      );

      const fotosMap = new Map<string, FotoRow>(fotosRaw.map(f => [f.id, f]));

      // Verificar que todas las ids existen
      const errores: Array<{ id: string; motivo: string }> = [];
      for (const id of idsUnicos) {
        if (!fotosMap.has(id)) errores.push({ id, motivo: 'Foto no encontrada.' });
      }
      if (errores.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Algunas fotos no existen.', detalle: errores }, { status: 400 });
      }

      // ── Cargar ubicaciones pedidas ────────────────────────────────────
      let ubicacionesMap = new Map<string, UbicacionRow>();
      if (['publicar', 'quitar'].includes(accion) && Array.isArray(ubicacionesPedidas) && ubicacionesPedidas.length > 0) {
        const slugsUbic: string[] = ubicacionesPedidas.filter((s: unknown) => typeof s === 'string');
        if (slugsUbic.length > 0) {
          const { rows: ubicRows } = await client.query<UbicacionRow>(
            `SELECT slug, proyecto_id, solo_admin, activo FROM fotos_ubicaciones WHERE slug = ANY($1)`,
            [slugsUbic]
          );
          ubicacionesMap = new Map(ubicRows.map(u => [u.slug, u]));
          // Verificar que todas las ubicaciones existen y están activas
          for (const slug of slugsUbic) {
            const ubic = ubicacionesMap.get(slug);
            if (!ubic || !ubic.activo) {
              errores.push({ id: slug, motivo: `Ubicación "${slug}" no existe o está inactiva.` });
            }
          }
          if (errores.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Ubicaciones inválidas.', detalle: errores }, { status: 400 });
          }
        }
      }

      // ── Proyectos gestionables del usuario (para líderes) ─────────────
      let misProyectos: Set<string> = new Set();
      let misUbicacionesPermitidas: Set<string> = new Set();
      if (!esAdmin) {
        // Consulta en vivo — no usar la cookie
        const { rows: pmRows } = await client.query(
          `SELECT pm.proyecto_id
           FROM proyecto_miembros pm
           WHERE pm.usuario_id = $1 AND pm.activo = true AND pm.rol_en_proyecto IN ('lider','colider')`,
          [Number(sesion.id)]
        );
        misProyectos = new Set(pmRows.map((r: any) => r.proyecto_id));

        const { rows: ubicRows2 } = await client.query(
          `SELECT slug FROM fotos_ubicaciones WHERE proyecto_id = ANY($1) AND activo = true AND solo_admin = false`,
          [Array.from(misProyectos)]
        );
        misUbicacionesPermitidas = new Set(ubicRows2.map((r: any) => r.slug));
      }

      // ── Validar cada foto × ubicación × acción ──────────────────────
      for (const id of idsUnicos) {
        const foto = fotosMap.get(id)!;

        // publicar: no se puede si tiene menores o es interna
        if (accion === 'publicar') {
          if (foto.menores !== 'no' || foto.visibilidad !== 'publicable') {
            errores.push({ id, motivo: 'Foto con menores o interna: no se puede publicar.' });
            continue;
          }
          // Verificar gate de fuente aprobada (para eventos/podcasts/asistencia sin aprobación)
          if (['evento', 'podcast'].includes(foto.origen) && foto.fuente_id) {
            const { rows: aprobRows } = await client.query(
              `SELECT 1 FROM actividades_difusion WHERE id::text = $1 AND aprobado_sitio = true`,
              [foto.fuente_id]
            );
            if (aprobRows.length === 0) {
              errores.push({ id, motivo: 'La fuente de esta foto (evento/podcast) no está aprobada.' });
              continue;
            }
          }
          if (foto.origen === 'asistencia' && foto.fuente_id) {
            const { rows: aprobRows } = await client.query(
              `SELECT 1 FROM asistencia_espacio WHERE id::text = $1 AND estado_aprobacion = 'aprobado'`,
              [foto.fuente_id]
            );
            if (aprobRows.length === 0) {
              errores.push({ id, motivo: 'La asistencia de esta foto no está aprobada.' });
              continue;
            }
          }
        }

        // Permisos por foto para líderes
        if (!esAdmin) {
          // El líder solo puede operar fotos de sus proyectos
          const proyectosDeFoto = foto.proyectos as string[];
          const tieneAcceso = proyectosDeFoto.some(p => misProyectos.has(p));
          if (!tieneAcceso || proyectosDeFoto.length === 0) {
            errores.push({ id, motivo: 'Sin acceso a esta foto (no pertenece a tus proyectos).' });
            continue;
          }

          // Verificar ubicaciones pedidas para publicar/quitar
          if (['publicar', 'quitar'].includes(accion)) {
            const entradas = Array.from(ubicacionesMap.entries());
            for (const [slugUbic, ubic] of entradas) {
              // portada y ubicaciones solo_admin → bloquear para líderes
              if (ubic.solo_admin) {
                errores.push({ id, motivo: `La ubicación "${slugUbic}" requiere administración del sitio.` });
                break;
              }
              // Ubicación de proyecto ajeno
              if (!misUbicacionesPermitidas.has(slugUbic)) {
                errores.push({ id, motivo: `Sin permiso para la ubicación "${slugUbic}".` });
                break;
              }
              // La foto debe pertenecer al proyecto de la ubicación
              if (ubic.proyecto_id && !foto.proyectos.includes(ubic.proyecto_id)) {
                errores.push({ id, motivo: `La foto no pertenece al proyecto de la ubicación "${slugUbic}".` });
                break;
              }
            }
          }
        } else {
          // Admin: solo verificar ubicaciones solo_admin permitidas (siempre sí)
          if (['publicar', 'quitar'].includes(accion)) {
            const entradas = Array.from(ubicacionesMap.entries());
            for (const [slugUbic, ubic] of entradas) {
              if (!ubic.activo) {
                errores.push({ id, motivo: `La ubicación "${slugUbic}" está inactiva.` });
                break;
              }
            }
          }
        }
      }

      if (errores.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Validación fallida. Ninguna foto fue modificada.', detalle: errores }, { status: 409 });
      }

      // ── Ejecutar acción ────────────────────────────────────────────────
      const slugsUbic = Array.from(ubicacionesMap.keys());

      if (accion === 'publicar') {
        // Agregar ubicaciones (union sin duplicar) y activar
        await client.query(
          `UPDATE fotos
           SET ubicaciones = (
             SELECT array_agg(DISTINCT ubic) FROM unnest(ubicaciones || $2::text[]) AS ubic
           ),
           activo = true,
           updated = now()
           WHERE id = ANY($1)`,
          [idsUnicos, slugsUbic]
        );
      } else if (accion === 'quitar') {
        // Quitar solo las ubicaciones que el usuario gestiona (las ajenas se conservan)
        if (esAdmin) {
          await client.query(
            `UPDATE fotos
             SET ubicaciones = (
               SELECT COALESCE(array_agg(u), '{}')
               FROM unnest(ubicaciones) AS u
               WHERE u <> ALL($2::text[])
             ),
             updated = now()
             WHERE id = ANY($1)`,
            [idsUnicos, slugsUbic]
          );
        } else {
          // Líder: quitar solo las de sus ubicaciones
          const misSlugsList = Array.from(misUbicacionesPermitidas);
          const slugsAQuitar = slugsUbic.filter(s => misSlugsList.includes(s));
          if (slugsAQuitar.length > 0) {
            await client.query(
              `UPDATE fotos
               SET ubicaciones = (
                 SELECT COALESCE(array_agg(u), '{}')
                 FROM unnest(ubicaciones) AS u
                 WHERE u <> ALL($2::text[])
               ),
               updated = now()
               WHERE id = ANY($1)`,
              [idsUnicos, slugsAQuitar]
            );
          }
        }
      } else if (accion === 'ocultar') {
        await client.query(`UPDATE fotos SET activo = false, updated = now() WHERE id = ANY($1)`, [idsUnicos]);
      } else if (accion === 'mostrar') {
        await client.query(`UPDATE fotos SET activo = true, updated = now() WHERE id = ANY($1)`, [idsUnicos]);
      } else if (accion === 'descartar') {
        await client.query(
          `UPDATE fotos SET activo = false, ubicaciones = '{}', updated = now() WHERE id = ANY($1)`,
          [idsUnicos]
        );
      } else if (accion === 'marcar_revisada') {
        await client.query(
          `UPDATE fotos SET menores = 'no', visibilidad = 'publicable', updated = now() WHERE id = ANY($1)`,
          [idsUnicos]
        );
      } else if (accion === 'marcar_interna') {
        await client.query(
          `UPDATE fotos SET menores = 'si', visibilidad = 'interna', ubicaciones = '{}', activo = false, updated = now() WHERE id = ANY($1)`,
          [idsUnicos]
        );
      }

      await client.query('COMMIT');

      // ── Calcular avisos de tope suave ─────────────────────────────────
      const avisos: Array<{ slug: string; publicadas: number; max_fotos: number }> = [];
      if (accion === 'publicar' && slugsUbic.length > 0) {
        const { rows: topes } = await client.query(
          `SELECT fu.slug, fu.max_fotos,
             (SELECT count(*) FROM fotos f
              WHERE f.activo = true AND f.visibilidad = 'publicable' AND f.menores = 'no'
                AND fu.slug = ANY(f.ubicaciones)) AS publicadas
           FROM fotos_ubicaciones fu WHERE slug = ANY($1)`,
          [slugsUbic]
        );
        for (const t of topes) {
          avisos.push({ slug: t.slug, publicadas: Number(t.publicadas), max_fotos: t.max_fotos });
        }
      }

      return NextResponse.json({ ok: true, modificadas: idsUnicos.length, avisos });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.code === '23514') {
      return NextResponse.json({ error: 'La acción viola una restricción de la base de datos (ej: foto con menores no puede tener ubicaciones).' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
