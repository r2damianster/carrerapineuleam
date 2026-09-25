// Categoría de espacio (qué tarea del marco lógico alimenta) + meta/fuente por actividad del plan.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE "espacios_enseñanza" ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'otro'`;
await sql`ALTER TABLE "espacios_enseñanza" DROP CONSTRAINT IF EXISTS espacios_categoria_check`;
await sql`ALTER TABLE "espacios_enseñanza" ADD CONSTRAINT espacios_categoria_check CHECK (categoria IN ('club','podcast','investigacion','otro'))`;
// Backfill: Podcast -> podcast; el resto de espacios de Vinculación son clubes.
await sql`UPDATE "espacios_enseñanza" SET categoria = 'podcast' WHERE area = 'vinculacion' AND (tipo = 'podcast' OR lower(nombre) = 'podcast')`;
await sql`UPDATE "espacios_enseñanza" SET categoria = 'club' WHERE area = 'vinculacion' AND categoria = 'otro'`;

await sql`ALTER TABLE proyecto_actividades_plan ADD COLUMN IF NOT EXISTS meta_cantidad NUMERIC`;
await sql`ALTER TABLE proyecto_actividades_plan ADD COLUMN IF NOT EXISTS unidad TEXT`;
await sql`ALTER TABLE proyecto_actividades_plan ADD COLUMN IF NOT EXISTS fuente TEXT NOT NULL DEFAULT 'manual'`;
await sql`ALTER TABLE proyecto_actividades_plan DROP CONSTRAINT IF EXISTS plan_fuente_check`;
await sql`ALTER TABLE proyecto_actividades_plan ADD CONSTRAINT plan_fuente_check CHECK (fuente IN ('asistencia_club','autonomas_encuesta','podcast','evento','investigacion','manual'))`;

// Metas por periodo (las anuales del marco lógico se reparten a la mitad).
const metas = [
  ['1.1', 'asistencia_club', 3, 'espacios con sesiones'],
  ['1.2', 'autonomas_encuesta', 70, '% de satisfacción'],
  ['2.1', 'podcast', 3, 'programas virtuales'],
  ['2.2', 'evento', 1, 'encuentro'],
  ['3.1', 'evento', 1, 'eventos'],
  ['3.2', 'investigacion', 6, 'estudiantes'],
];
for (const [codigo, fuente, meta, unidad] of metas) {
  await sql`UPDATE proyecto_actividades_plan SET fuente = ${fuente}, meta_cantidad = ${meta}, unidad = ${unidad}
            WHERE actividad LIKE ${codigo + ' %'} AND meta_cantidad IS NULL`;
}
console.log('OK');
