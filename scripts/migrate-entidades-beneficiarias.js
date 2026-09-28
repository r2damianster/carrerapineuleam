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
// Entidades externas (mismo día, confirmadas explícitamente por el usuario tras la primera
// pasada de esta migración): Fundación Cross World -> "Cross Worlds for Connections"; Fundación
// Submarino Amarillo -> espacio del mismo nombre; Unidad Educativa Fiscomisional Juan Montalvo ->
// "Juan Montalvo Speaking Club" y su variante "- Grupo Cintya" (misma institución, 2 grupos);
// Unidad Educativa Manuela Cañizares -> "UE Manuela Cañizares Speaking Club".
//
// "Speaking Club - Básica Bilingüe" e "Inicial Bilingüe" siguen sin `entidad_id` — el usuario no
// confirmó su institución anfitriona (regla de oro: nunca adivinar); se asignan desde
// /vinculacion/espacios cuando se confirme.

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

  const [juanMontalvo, manuelaCanizares, crossWorld, submarino] = await sql`
    INSERT INTO entidades_beneficiarias (nombre, tipo) VALUES
      ('Unidad Educativa Fiscomisional Juan Montalvo', 'unidad_educativa'),
      ('Unidad Educativa Manuela Cañizares', 'unidad_educativa'),
      ('Fundación Cross World', 'fundacion'),
      ('Fundación Submarino Amarillo', 'fundacion')
    RETURNING id
  `;
  await sql`
    UPDATE "espacios_enseñanza" SET entidad_id = CASE
      WHEN nombre IN ('Juan Montalvo Speaking Club', 'Juan Montalvo Speaking Club - Grupo Cintya') THEN ${juanMontalvo.id}
      WHEN nombre = 'UE Manuela Cañizares Speaking Club' THEN ${manuelaCanizares.id}
      WHEN nombre = 'Cross Worlds for Connections' THEN ${crossWorld.id}
      WHEN nombre = 'Fundación Submarino Amarillo' THEN ${submarino.id}
    END
    WHERE nombre IN ('Juan Montalvo Speaking Club', 'Juan Montalvo Speaking Club - Grupo Cintya', 'UE Manuela Cañizares Speaking Club', 'Cross Worlds for Connections', 'Fundación Submarino Amarillo')
  `;

  console.log('Catálogo de entidades beneficiarias creado. 5 espacios internos con ULEAM-FEDU, 5 espacios externos con su entidad real.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
