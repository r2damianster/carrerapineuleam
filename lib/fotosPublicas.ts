// lib/fotosPublicas.ts
// Lógica de lectura pública del banco de fotos con topes y relleno automático.
// Sin imports de Node/Neon a nivel de módulo — recibe `sql` desde el handler.

import { miniaturaCloudinary } from './cloudinaryUrl';

// ── fragmentoFuenteAprobada ──────────────────────────────────────────────────
// Fragmento SQL reutilizable: solo fotos cuya fuente esté aprobada.
// Exportado para reutilizar en el listado admin (WP4).
// IMPORTANTE: usa `fotos` como alias de la tabla principal.
export const fragmentoFuenteAprobada = `(
  origen IN ('admin', 'lider')
  OR (
    origen IN ('evidencia_evento')
  )
  OR (
    origen IN ('evento', 'podcast')
    AND EXISTS (
      SELECT 1 FROM actividades_difusion a
      WHERE a.id::text = fotos.fuente_id
        AND a.aprobado_sitio = true
    )
  )
  OR (
    origen = 'asistencia'
    AND EXISTS (
      SELECT 1 FROM asistencia_espacio s
      WHERE s.id::text = fotos.fuente_id
        AND s.estado_aprobacion = 'aprobado'
    )
  )
)`;

export interface FotoUbicacion {
  slug: string;
  nombre: string;
  proyecto_id: string | null;
  max_fotos: number;
  solo_admin: boolean;
  auto_origen: string | null;
  auto_cantidad: number;
}

export interface FotoPublica {
  id: string;
  url: string;
  cloudinary_public_id: string | null;
  titulo: string | null;
  descripcion: string | null;
  ubicaciones: string[];
  order: number;
  activo: boolean;
  origen: string;
  posicion: number;
  miniatura: string;
  [key: string]: unknown;
}

/**
 * Devuelve el arreglo final de fotos públicas para una ubicación, ya con tope y
 * relleno automático. Si la ubicación no existe o está inactiva → [].
 * Esta es la función que llama el GET público /api/photos?ubicacion=X.
 */
export async function obtenerFotosDeUbicacion(
  sql: any,
  slug: string
): Promise<FotoPublica[]> {
  if (!slug) return [];

  // 1. Leer catálogo de la ubicación
  const [ubicacion]: FotoUbicacion[] = await sql`
    SELECT slug, nombre, proyecto_id, max_fotos, solo_admin, auto_origen, auto_cantidad
    FROM fotos_ubicaciones
    WHERE slug = ${slug} AND activo = true
  `;
  if (!ubicacion) return []; // slug desconocido o inactivo → nada

  const cupoManual = ubicacion.max_fotos - ubicacion.auto_cantidad;

  // 2. Fotos manuales (asignadas explícitamente a esta ubicación)
  const manuales: any[] = await sql`
    SELECT *
    FROM fotos
    WHERE activo = true
      AND descartada = false
      AND visibilidad = 'publicable'
      AND menores = 'no'
      AND ${slug} = ANY(ubicaciones)
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
    ORDER BY "order" ASC, created DESC
    LIMIT ${cupoManual}
  `;

  // 3. Fotos automáticas (relleno por origen reciente, ej: 2 podcasts en Docencia)
  let automaticas: any[] = [];
  if (ubicacion.auto_origen && ubicacion.auto_cantidad > 0) {
    const idsYIncluidos = manuales.map(f => f.id);
    automaticas = await sql`
      SELECT *
      FROM fotos
      WHERE origen = ${ubicacion.auto_origen}
        AND activo = true
        AND descartada = false
        AND visibilidad = 'publicable'
        AND menores = 'no'
        AND id <> ALL(${idsYIncluidos}::text[])
        AND (
          EXISTS (
            SELECT 1 FROM actividades_difusion a
            WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true
          )
        )
      ORDER BY fecha_evento DESC NULLS LAST, created DESC
      LIMIT ${ubicacion.auto_cantidad}
    `;
  }

  // 4. Resultado combinado con miniatura
  const todas = [...manuales, ...automaticas].slice(0, ubicacion.max_fotos);
  return todas.map(f => ({
    ...f,
    miniatura: miniaturaCloudinary(f.url, 400),
  }));
}
