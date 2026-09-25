// lib/ingestaFotos.ts — WP5
// Helper de ingesta al banco de fotos. Usado por asistencia, difusión,
// enlaces de externos y subida directa del líder/admin.
//
// IMPORTANTE: Una falla de ingesta NUNCA debe hacer fallar el registro principal.
// Usar siempre dentro de un try/catch externo.
// No se llama a ninguna IA de visión (WP6 eliminado).

export interface DatosIngesta {
  url: string;
  cloudinary_public_id?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  origen: 'admin' | 'evidencia_evento' | 'evento' | 'podcast' | 'asistencia' | 'lider';
  fuente_id?: string | null;       // id del registro fuente (asistencia_espacio.id, actividades_difusion.id)
  fecha_evento?: string | null;    // ISO date
  categoria?: string | null;
  proyectos?: string[];            // ids de proyectos asociados
  subido_por_id?: number | null;   // usuarios.id numérico
  subido_por?: string | null;      // email (para columna legacy)
  /** true = el usuario declaró que hay menores → menores='si', interna, inactivo */
  hayMenores?: boolean;
  /** true = foto de externo sin identificar → menores='revisar', interna */
  esExterno?: boolean;
}

/**
 * Registra una foto en el banco de fotos.
 * - Idempotente: usa ON CONFLICT (origen, fuente_id, url) DO NOTHING cuando fuente_id está presente.
 * - Nunca lanza hacia el llamador: captura errores internamente y retorna null en ese caso.
 */
export async function registrarFotoEnBanco(
  sql: any,
  datos: DatosIngesta
): Promise<{ id: string } | null> {
  try {
    const {
      url,
      cloudinary_public_id = null,
      titulo = null,
      descripcion = null,
      origen,
      fuente_id = null,
      fecha_evento = null,
      categoria = null,
      proyectos = [],
      subido_por_id = null,
      subido_por = null,
      hayMenores = false,
      esExterno = false,
    } = datos;

    if (!url) return null;

    // Determinar estado de menores y visibilidad
    // Prioridad: esExterno > hayMenores > ninguno
    const menores: 'no' | 'si' | 'revisar' = esExterno
      ? 'revisar'
      : hayMenores
        ? 'si'
        : 'no';
    const visibilidad: 'publicable' | 'interna' =
      menores === 'no' ? 'publicable' : 'interna';
    const activo = menores === 'no';

    const id = `foto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const [result] = await sql`
      INSERT INTO fotos (
        id, url, cloudinary_public_id, titulo, descripcion,
        ubicaciones, "order", posicion, activo,
        origen, fuente_id, fecha_evento, categoria,
        proyectos, subido_por_id, subido_por,
        menores, visibilidad
      )
      VALUES (
        ${id}, ${url}, ${cloudinary_public_id}, ${titulo}, ${descripcion},
        '{}', 0, 50, ${activo},
        ${origen}, ${fuente_id}, ${fecha_evento ? new Date(fecha_evento) : null}, ${categoria},
        ${proyectos}, ${subido_por_id}, ${subido_por},
        ${menores}, ${visibilidad}
      )
      ON CONFLICT (origen, fuente_id, url) WHERE fuente_id IS NOT NULL DO NOTHING
      RETURNING id
    `;

    return result ?? null; // DO NOTHING devuelve undefined → null
  } catch (err) {
    // Una falla de ingesta NO debe propagar: el registro principal ya se guardó.
    console.error('[ingestaFotos] Error al registrar foto en el banco:', err);
    return null;
  }
}
