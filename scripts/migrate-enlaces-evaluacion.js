import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Tabla para el módulo de "enlaces públicos de evaluación" (Sesión 28): un
// estudiante-instructor de Vinculación genera un link/QR sin login para que
// el beneficiario tome el test MCER o la encuesta de satisfacción
// directamente desde su celular. Dos flujos distintos comparten la misma
// tabla:
//
// - PRETEST: el beneficiario aún no existe en el sistema. El link es por
//   sesión (fecha de expiración elegida por el instructor al generarlo) y
//   reutilizable dentro de esa ventana por todo el grupo que asista ese día
//   (max_usos = NULL). Al enviarse, crea el usuario+perfil+inscripción y la
//   evaluación en un solo paso (ver /api/publico/inscripcion-pretest).
// - POSTEST: el beneficiario ya existe y está inscrito en el espacio — el
//   instructor lo elige de la lista y el link queda ligado a su
//   beneficiario_id. Token de un solo uso (max_usos = 1) — no requiere
//   verificación de identidad adicional, el token largo (UUID) es la única
//   protección (decisión explícita del usuario).
//
// Aplica tanto a evaluaciones_mcer como a encuestas_satisfaccion
// (test_tipo) — misma infraestructura para ambas, a pedido del usuario.
//
// Aplicado ya en producción vía Neon MCP (Sesión 28). Este script queda
// como referencia idéntica al cambio ya aplicado.

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS enlaces_evaluacion (
      token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo varchar(10) NOT NULL CHECK (tipo IN ('pretest', 'postest')),
      test_tipo varchar(10) NOT NULL CHECK (test_tipo IN ('mcer', 'encuesta')),
      espacio_id integer NOT NULL REFERENCES espacios_enseñanza(id) ON DELETE CASCADE,
      beneficiario_id integer REFERENCES usuarios(id) ON DELETE CASCADE,
      ciclo_id integer REFERENCES ciclos_academicos(id),
      creado_por integer NOT NULL REFERENCES usuarios(id),
      expira_en timestamptz NOT NULL,
      max_usos integer,
      usos_actuales integer NOT NULL DEFAULT 0,
      creado_en timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT enlaces_evaluacion_postest_tiene_beneficiario
        CHECK (tipo = 'pretest' OR beneficiario_id IS NOT NULL),
      CONSTRAINT enlaces_evaluacion_encuesta_tiene_ciclo
        CHECK (test_tipo = 'mcer' OR ciclo_id IS NOT NULL)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS enlaces_evaluacion_espacio_idx ON enlaces_evaluacion (espacio_id)`;
  await sql`CREATE INDEX IF NOT EXISTS enlaces_evaluacion_beneficiario_idx ON enlaces_evaluacion (beneficiario_id)`;

  console.log('Tabla enlaces_evaluacion creada/verificada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
