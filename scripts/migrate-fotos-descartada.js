// scripts/migrate-fotos-descartada.js
// 1) "Descartar" pasa a ser un estado real y reversible de una foto (fotos.descartada): una foto descartada
//    no se usa en el sitio, ni en noticias, ni en informes. No se borra nada (ni la fila ni el archivo).
// 2) Rellena los títulos vacíos de las fotos que entraron por la ingesta automática.
//
//   node --env-file=.env.local scripts/migrate-fotos-descartada.js
//
// Idempotente. Requiere haber corrido migrate-fotos-banco.js. ROLLBACK (comentado al final).

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function fechaCorta(fechaIso) {
  const fecha = new Date(fechaIso);
  const dd = String(fecha.getUTCDate()).padStart(2, '0');
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getUTCFullYear()}`;
}

async function main() {
  // 0. Respaldo
  await sql`CREATE TABLE IF NOT EXISTS respaldo_fotos_descartada_20260926 AS SELECT * FROM fotos`;
  const [{ filas }] = await sql`SELECT count(*)::int AS filas FROM respaldo_fotos_descartada_20260926`;
  console.log(`[0] respaldo: ${filas} filas`);

  // 1. Columnas del estado "descartada"
  await sql`
    ALTER TABLE fotos
      ADD COLUMN IF NOT EXISTS descartada      boolean     NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS descartada_por  integer     REFERENCES usuarios(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS descartada_en   timestamptz,
      ADD COLUMN IF NOT EXISTS motivo_descarte text`;
  await sql`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_motivo_descarte_check`;
  await sql`ALTER TABLE fotos ADD CONSTRAINT fotos_motivo_descarte_check
            CHECK (motivo_descarte IS NULL OR motivo_descarte IN ('menores', 'mala_calidad', 'duplicada', 'otro'))`;
  // Una descartada nunca está activa ni ubicada (guardia de BD; las APIs lo aseguran antes).
  await sql`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_descartada_inactiva_check`;
  await sql`ALTER TABLE fotos ADD CONSTRAINT fotos_descartada_inactiva_check
            CHECK (NOT descartada OR (activo = false AND cardinality(ubicaciones) = 0)) NOT VALID`;
  await sql`ALTER TABLE fotos VALIDATE CONSTRAINT fotos_descartada_inactiva_check`;
  await sql`CREATE INDEX IF NOT EXISTS fotos_descartada_url_idx ON fotos (url) WHERE descartada`;
  console.log('[1] columnas, CHECKs e índice OK');

  // 2. Función central: ¿esta imagen (por URL) está descartada? La usan galerías, noticias e informes.
  await sql`
    CREATE OR REPLACE FUNCTION foto_descartada(p_url text) RETURNS boolean
    LANGUAGE sql STABLE AS $$
      SELECT p_url IS NOT NULL AND EXISTS (SELECT 1 FROM fotos WHERE url = p_url AND descartada)
    $$`;
  console.log('[2] función foto_descartada(url) OK');

  // 3. Títulos: evento/podcast → título de la actividad; asistencia → "Espacio — dd/mm/aaaa";
  //    repetidos → se numeran (1), (2)…; sin origen conocido → "n - dd/mm/aa" (número y fecha de creación).
  const sinTitulo = await sql`
    SELECT f.id, f.origen, f.fuente_id, f.created,
           a.titulo AS titulo_actividad,
           e.nombre AS espacio_nombre, s.fecha AS fecha_asistencia
    FROM fotos f
    LEFT JOIN actividades_difusion a ON f.origen IN ('evento', 'podcast') AND a.id::text = f.fuente_id
    LEFT JOIN asistencia_espacio s ON f.origen = 'asistencia' AND s.id::text = f.fuente_id
    LEFT JOIN "espacios_enseñanza" e ON e.id = s.espacio_id
    WHERE f.titulo IS NULL OR btrim(f.titulo) = ''
    ORDER BY f.created ASC, f.id ASC`;

  let contadorDesconocidas = 0; // "n - dd/mm/aa": número correlativo de las fotos sin nombre conocido
  const propuestas = sinTitulo.map((fila) => {
    let base = null;
    if (fila.titulo_actividad) base = fila.titulo_actividad.trim();
    else if (fila.espacio_nombre && fila.fecha_asistencia) base = `${fila.espacio_nombre} — ${fechaCorta(fila.fecha_asistencia)}`;
    return { id: fila.id, base, created: fila.created };
  });
  const repeticiones = new Map();
  for (const propuesta of propuestas) if (propuesta.base) repeticiones.set(propuesta.base, (repeticiones.get(propuesta.base) ?? 0) + 1);
  const numeradas = new Map();
  let actualizadas = 0;
  for (const propuesta of propuestas) {
    let titulo;
    if (!propuesta.base) {
      contadorDesconocidas += 1;
      titulo = `${contadorDesconocidas} - ${fechaCorta(propuesta.created).slice(0, 6)}${String(new Date(propuesta.created).getUTCFullYear()).slice(2)}`;
    } else if (repeticiones.get(propuesta.base) > 1) {
      const numero = (numeradas.get(propuesta.base) ?? 0) + 1;
      numeradas.set(propuesta.base, numero);
      titulo = `${propuesta.base} (${numero})`;
    } else {
      titulo = propuesta.base;
    }
    await sql`UPDATE fotos SET titulo = ${titulo}, updated = now() WHERE id = ${propuesta.id}`;
    actualizadas += 1;
  }
  console.log(`[3] títulos rellenados: ${actualizadas}`);

  // 4. Verificación
  const [{ vacios }] = await sql`SELECT count(*)::int AS vacios FROM fotos WHERE titulo IS NULL OR btrim(titulo) = ''`;
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM fotos`;
  const [{ descartadas }] = await sql`SELECT count(*)::int AS descartadas FROM fotos WHERE descartada`;
  console.log(`[4] fotos=${total} (antes ${filas}) | sin título=${vacios} | descartadas=${descartadas}`);
  const [{ prueba }] = await sql`SELECT foto_descartada('https://no-existe.example/x.jpg') AS prueba`;
  console.log(`    foto_descartada(url inexistente) = ${prueba} (debe ser false)`);
}

main().catch((error) => { console.error('ERROR:', error.message); process.exit(1); });

// ROLLBACK (solo si hace falta): DROP FUNCTION foto_descartada(text);
//   ALTER TABLE fotos DROP COLUMN descartada, DROP COLUMN descartada_por, DROP COLUMN descartada_en, DROP COLUMN motivo_descarte;
//   Los títulos se restauran desde respaldo_fotos_descartada_20260926.
