// Subsistema de aportantes de Investigación (independiente de Vinculación).
// - Rol de cuenta nuevo `colaborador` (externos / estudiantes de apoyo a un proyecto de investigación).
// - investigacion_aportantes: quién aporta a qué proyecto (una fila por proyecto, una persona puede estar en varios).
// - investigacion_aportes: lo que aporta cada quien; puede ligarse a una actividad del plan (meta) y lo valida el líder.
// Las horas son solo reconocimiento: no hay meta ni tope. Un pasante de Vinculación (rol estudiante) NO puede ser aportante.
// Uso: node --env-file=.env.local scripts/migrate-investigacion-aportantes.js
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check`;
  await sql`ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol::text = ANY (ARRAY['admin','profesor','estudiante','beneficiario','secretaria','colaborador']))`;

  await sql`
    CREATE TABLE IF NOT EXISTS investigacion_aportantes (
      id SERIAL PRIMARY KEY,
      proyecto_id TEXT NOT NULL REFERENCES proyectos(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      tipo TEXT NOT NULL CHECK (tipo IN ('docente', 'estudiante_apoyo', 'externo')),
      activo BOOLEAN NOT NULL DEFAULT true,
      visible_en_web BOOLEAN NOT NULL DEFAULT false,
      agregado_por INTEGER REFERENCES usuarios(id),
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (proyecto_id, usuario_id)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inv_aportantes_usuario ON investigacion_aportantes (usuario_id) WHERE activo`;

  await sql`
    CREATE TABLE IF NOT EXISTS investigacion_aportes (
      id SERIAL PRIMARY KEY,
      proyecto_id TEXT NOT NULL,
      usuario_id INTEGER NOT NULL,
      actividad_plan_id INTEGER REFERENCES proyecto_actividades_plan(id) ON DELETE SET NULL,
      actividad_difusion_id INTEGER REFERENCES actividades_difusion(id) ON DELETE SET NULL,
      fecha DATE NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'actividad' CHECK (tipo IN ('actividad', 'evento', 'podcast', 'producto', 'otro')),
      descripcion TEXT NOT NULL,
      horas NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (horas >= 0),
      estado_validacion TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_validacion IN ('pendiente', 'validado', 'rechazado')),
      validado_por INTEGER REFERENCES usuarios(id),
      fecha_validacion TIMESTAMPTZ,
      motivo_rechazo TEXT,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (proyecto_id, usuario_id) REFERENCES investigacion_aportantes (proyecto_id, usuario_id)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inv_aportes_proyecto ON investigacion_aportes (proyecto_id, estado_validacion)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inv_aportes_actividad ON investigacion_aportes (actividad_plan_id) WHERE actividad_plan_id IS NOT NULL`;

  console.log('Migración de aportantes de Investigación aplicada.');
}

main().catch((error) => { console.error(error); process.exit(1); });
