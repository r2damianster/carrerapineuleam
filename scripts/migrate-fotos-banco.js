// WP1 — Banco de fotos + topes: migración de BD (2026-09-25)
// Extiende `fotos` con columnas de banco (proyectos, menores, visibilidad, etc.),
// crea `fotos_ubicaciones` con el catálogo de secciones + topes, extiende
// `actividades_difusion` y `enlaces_difusion` con columna `proyectos`.
//
// Uso: node --env-file=.env.local scripts/migrate-fotos-banco.js
//
// El script es IDEMPOTENTE: usa IF NOT EXISTS, DROP CONSTRAINT IF EXISTS.
// Pasos con SELECT de verificación incluidos.
//
// ROLLBACK (comentado al final): DROP TABLE fotos_ubicaciones; ALTER TABLE fotos DROP COLUMN ...

import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  // ─── 0. Respaldo ─────────────────────────────────────────────────────────
  console.log('[0] Creando respaldo respaldo_fotos_20260926...');
  await sql`CREATE TABLE IF NOT EXISTS respaldo_fotos_20260926 AS SELECT * FROM fotos`;
  const [{ count: cRespaldo }] = await sql`SELECT count(*) FROM respaldo_fotos_20260926`;
  console.log(`    → ${cRespaldo} filas en el respaldo.`);

  // ─── 1. Columnas nuevas en `fotos` (aditivas) ────────────────────────────
  console.log('[1] Añadiendo columnas a fotos...');
  // Nota: ia_resultado eliminado (WP6 eliminado — sin Groq)
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS proyectos       text[]  NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS fuente_id       text`;
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS fecha_evento    date`;
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS categoria       text`;
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS subido_por_id   integer REFERENCES usuarios(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS menores         text    NOT NULL DEFAULT 'no'`;
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS visibilidad     text    NOT NULL DEFAULT 'publicable'`;
  console.log('    → columnas añadidas (idempotente).');

  // ─── 2. CHECKs ───────────────────────────────────────────────────────────
  console.log('[2] Configurando constraints CHECK...');

  // Ampliar origen (agregar 'evento','podcast','asistencia','lider')
  await sql`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_origen_check`;
  await sql`
    ALTER TABLE fotos ADD CONSTRAINT fotos_origen_check
      CHECK (origen IN ('admin','evidencia_evento','evento','podcast','asistencia','lider'))
  `;

  // menores y visibilidad
  await sql`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_menores_check`;
  await sql`
    ALTER TABLE fotos ADD CONSTRAINT fotos_menores_check
      CHECK (menores IN ('no','si','revisar'))
  `;
  await sql`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_visibilidad_check`;
  await sql`
    ALTER TABLE fotos ADD CONSTRAINT fotos_visibilidad_check
      CHECK (visibilidad IN ('publicable','interna'))
  `;

  // ⚠️ PRE-VERIFICACIÓN OBLIGATORIA antes del constraint de publicabilidad:
  // Si hay filas con menores≠'no' Y ubicaciones asignadas, el VALIDATE fallará.
  console.log('[2.pre] Verificando filas que violarían fotos_publicable_sin_menores...');
  const violadoras = await sql`
    SELECT id, menores, visibilidad, ubicaciones
    FROM fotos
    WHERE menores <> 'no' AND cardinality(ubicaciones) > 0
  `;
  if (violadoras.length > 0) {
    console.error('⛔ DETENIENDO: hay filas que violarían el constraint fotos_publicable_sin_menores:');
    console.error(JSON.stringify(violadoras, null, 2));
    console.error('Corrígelas (poner ubicaciones={} o menores=no) y vuelve a ejecutar.');
    process.exit(1);
  }
  console.log('    → 0 filas violadoras. Seguro continuar.');

  // Guardia de última línea: foto con menores/interna no puede tener ubicaciones
  await sql`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_publicable_sin_menores`;
  await sql`
    ALTER TABLE fotos ADD CONSTRAINT fotos_publicable_sin_menores
      CHECK ((menores = 'no' AND visibilidad = 'publicable') OR cardinality(ubicaciones) = 0) NOT VALID
  `;
  // VALIDATE solo sobre filas existentes (NOT VALID ya protege las nuevas)
  await sql`ALTER TABLE fotos VALIDATE CONSTRAINT fotos_publicable_sin_menores`;
  console.log('    → constraints OK.');

  // ─── 3. Índices ───────────────────────────────────────────────────────────
  console.log('[3] Creando índices...');
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS fotos_fuente_unica ON fotos (origen, fuente_id, url) WHERE fuente_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS fotos_ubicaciones_gin ON fotos USING gin (ubicaciones)`;
  await sql`CREATE INDEX IF NOT EXISTS fotos_proyectos_gin   ON fotos USING gin (proyectos)`;
  await sql`CREATE INDEX IF NOT EXISTS fotos_origen_idx      ON fotos (origen, created DESC)`;
  console.log('    → índices OK.');

  // ─── 4. Tabla fotos_ubicaciones ──────────────────────────────────────────
  console.log('[4] Creando tabla fotos_ubicaciones...');
  await sql`
    CREATE TABLE IF NOT EXISTS fotos_ubicaciones (
      slug           text PRIMARY KEY,
      nombre         text    NOT NULL,
      proyecto_id    text    REFERENCES proyectos(id) ON DELETE CASCADE,
      max_fotos      integer NOT NULL CHECK (max_fotos BETWEEN 1 AND 50),
      solo_admin     boolean NOT NULL DEFAULT false,
      auto_origen    text    CHECK (auto_origen IN ('podcast','evento')),
      auto_cantidad  integer NOT NULL DEFAULT 0 CHECK (auto_cantidad >= 0),
      orden          integer NOT NULL DEFAULT 0,
      activo         boolean NOT NULL DEFAULT true,
      CHECK (auto_cantidad <= max_fotos),
      CHECK (proyecto_id IS NOT NULL OR solo_admin)
    )
  `;

  // Seed de ubicaciones iniciales
  console.log('[4.seed] Insertando ubicaciones...');
  const ubicaciones = [
    { slug: 'portada',                     nombre: 'Portada del sitio',                     proyecto_id: null,                  max_fotos: 6,  solo_admin: true,  auto_origen: null, auto_cantidad: 0, orden: 0 },
    { slug: 'club-ingles',                 nombre: 'Club de Inglés (Vinculación)',           proyecto_id: 'vinculacion',         max_fotos: 10, solo_admin: false, auto_origen: null, auto_cantidad: 0, orden: 1 },
    { slug: 'docencia-galeria',            nombre: 'Galería de Docencia Innovadora',         proyecto_id: 'docencia_innovadora', max_fotos: 8,  solo_admin: false, auto_origen: 'podcast', auto_cantidad: 2, orden: 2 },
    { slug: 'redlea-galeria',              nombre: 'Galería RED LEA',                        proyecto_id: 'redlea',              max_fotos: 10, solo_admin: false, auto_origen: null, auto_cantidad: 0, orden: 3 },
    { slug: 'internacionalizacion-galeria',nombre: 'Galería de Internacionalización',        proyecto_id: 'internacionalizacion',max_fotos: 8,  solo_admin: false, auto_origen: null, auto_cantidad: 0, orden: 4 },
    { slug: 'desarrollo-habilidades-galeria',nombre: 'Galería de Desarrollo de Habilidades',proyecto_id: 'desarrollo_habilidades',max_fotos: 8, solo_admin: false, auto_origen: null, auto_cantidad: 0, orden: 5 },
    { slug: 'mentoring-galeria',           nombre: 'Galería de Mentoring',                  proyecto_id: 'mentoring',           max_fotos: 8,  solo_admin: false, auto_origen: null, auto_cantidad: 0, orden: 6 },
  ];

  for (const u of ubicaciones) {
    await sql`
      INSERT INTO fotos_ubicaciones (slug, nombre, proyecto_id, max_fotos, solo_admin, auto_origen, auto_cantidad, orden)
      VALUES (${u.slug}, ${u.nombre}, ${u.proyecto_id}, ${u.max_fotos}, ${u.solo_admin}, ${u.auto_origen}, ${u.auto_cantidad}, ${u.orden})
      ON CONFLICT (slug) DO NOTHING
    `;
  }

  const [{ count: cUbic }] = await sql`SELECT count(*) FROM fotos_ubicaciones`;
  console.log(`    → ${cUbic} filas en fotos_ubicaciones (esperado ≥ 7).`);

  // ─── 5. Backfill de fotos.proyectos desde fotos_ubicaciones ─────────────
  console.log('[5] Backfill fotos.proyectos desde ubicaciones existentes...');
  await sql`
    UPDATE fotos f
    SET proyectos = ARRAY[u.proyecto_id]
    FROM fotos_ubicaciones u
    WHERE cardinality(f.proyectos) = 0
      AND u.slug = f.ubicaciones[1]
      AND u.proyecto_id IS NOT NULL
  `;
  console.log('    → backfill de proyectos OK.');

  // ─── 6. Columnas en actividades_difusion y enlaces_difusion ─────────────
  console.log('[6] Extendiendo actividades_difusion y enlaces_difusion...');
  await sql`ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS proyectos text[] NOT NULL DEFAULT '{}'`;
  // enlaces_difusion: verificar existencia primero para no fallar si la tabla no existe
  const [{ exists: enlacesExiste }] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'enlaces_difusion'
    ) AS exists
  `;
  if (enlacesExiste) {
    await sql`ALTER TABLE enlaces_difusion ADD COLUMN IF NOT EXISTS proyectos text[] NOT NULL DEFAULT '{}'`;
    console.log('    → enlaces_difusion.proyectos añadida.');
  } else {
    console.log('    → tabla enlaces_difusion no existe aún (se creará en su propia migración).');
  }

  // ─── 7. Verificaciones finales ───────────────────────────────────────────
  console.log('[7] Verificaciones finales...');
  const [{ count: cFotos }]   = await sql`SELECT count(*) FROM fotos`;
  const [{ count: cUbicadas }]= await sql`SELECT count(*) FROM fotos WHERE cardinality(ubicaciones) > 0 AND (menores <> 'no' OR visibilidad <> 'publicable')`;
  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'fotos'
      AND column_name IN ('proyectos','fuente_id','fecha_evento','categoria','subido_por_id','menores','visibilidad')
    ORDER BY column_name
  `;

  console.log(`\n=== REPORTE FINAL ===`);
  console.log(`fotos.count               : ${cFotos} (esperado: 45)`);
  console.log(`fotos violadoras (pub+menor): ${cUbicadas} (esperado: 0)`);
  console.log(`fotos_ubicaciones.count   : ${cUbic} (esperado: 7)`);
  console.log(`columnas nuevas en fotos  : ${cols.map(c => c.column_name).join(', ')}`);
  console.log(`\n✅ migrate-fotos-banco completada.`);
  console.log(`\nAVISO DE CONTENIDO: Docencia Innovadora pasará de mostrar hasta 23 fotos a máximo 8`);
  console.log(`(6 manuales + 2 podcast automáticas). RED LEA pasará de 13 a máximo 10.`);
  console.log(`Después del deploy, Arturo debe curar el campo 'order' para elegir cuáles salen.`);
  console.log(`\n--- ROLLBACK (solo si el usuario lo pide) ---`);
  console.log(`DROP TABLE IF EXISTS fotos_ubicaciones;`);
  console.log(`ALTER TABLE fotos`);
  console.log(`  DROP COLUMN IF EXISTS proyectos,`);
  console.log(`  DROP COLUMN IF EXISTS fuente_id,`);
  console.log(`  DROP COLUMN IF EXISTS fecha_evento,`);
  console.log(`  DROP COLUMN IF EXISTS categoria,`);
  console.log(`  DROP COLUMN IF EXISTS subido_por_id,`);
  console.log(`  DROP COLUMN IF EXISTS menores,`);
  console.log(`  DROP COLUMN IF EXISTS visibilidad;`);
  console.log(`ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_origen_check;`);
  console.log(`ALTER TABLE fotos ADD CONSTRAINT fotos_origen_check CHECK (origen IN ('admin','evidencia_evento'));`);
  console.log(`-- Restaurar datos: SELECT * FROM respaldo_fotos_20260926`);
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
