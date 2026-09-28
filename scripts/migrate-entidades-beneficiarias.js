const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Catálogo de entidades beneficiarias reales (Cross Worlds, Fundación Submarino Amarillo,
// unidades educativas, ULEAM-FEDU) separado de "espacios" (clubes/aulas) — un espacio ocurre
// DENTRO de una entidad, no es la entidad. Antes solo existía `proyectos.entidad_beneficiaria`
// (1 solo texto libre para todo el proyecto), insuficiente para el informe del supervisor
// (cada supervisor puede tener espacios en entidades distintas).
//
// Aplicado ya en producción vía Neon MCP (sesión de informes semestrales, 2026-09-28). Este
// script queda como referencia idéntica al cambio aplicado — no hace falta volver a correrlo.
//
// Solo se asignó `entidad_id` a los espacios internos de la propia carrera (Speaking Club PINE
// A1/A2/B1/B1+ y Podcast) porque el usuario confirmó explícitamente que esos son "el resto de
// espacios de la ULEAM - Facultad de Educación y Turismo". Los demás espacios (Cross Worlds for
// Connections, Fundación Submarino Amarillo, Juan Montalvo Speaking Club x2, UE Manuela
// Cañizares Speaking Club, Speaking Club - Básica/Inicial Bilingüe) quedaron sin asignar a
// propósito — sus nombres reales de entidad anfitriona no fueron confirmados por el usuario
// (regla de oro: nunca adivinar), se asignan desde /vinculacion/espacios cuando el líder los
// confirme.

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS entidades_beneficiarias (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    ALTER TABLE "espacios_enseñanza"
      ADD COLUMN IF NOT EXISTS entidad_id INTEGER REFERENCES entidades_beneficiarias(id) ON DELETE SET NULL
  `;

  const [uleam] = await sql`
    INSERT INTO entidades_beneficiarias (nombre, tipo)
    VALUES ('Universidad Laica Eloy Alfaro de Manabí - Facultad de Educación y Turismo', 'universidad')
    RETURNING id
  `;

  await sql`
    UPDATE "espacios_enseñanza" SET entidad_id = ${uleam.id}
    WHERE nombre IN ('A1 Speaking Club PINE', 'A2 Speaking Club PINE', 'B1 Speaking Club PINE', 'B1+ Speaking Club PINE', 'Podcast')
  `;

  console.log('Catálogo de entidades beneficiarias creado. ULEAM-FEDU asignada a 5 espacios internos.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
