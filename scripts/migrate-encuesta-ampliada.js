import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Amplía la encuesta de satisfacción (Sesión 29, a pedido del usuario): antes
// solo tenía nivel_satisfaccion (1 pregunta general) + comentarios. Se agregan
// 3 dimensiones específicas más (aprendizaje, mejora, recursos) y una
// calificación por cada instructor/estudiante-instructor asignado al espacio
// (tabla aparte, porque el número de instructores por espacio varía).
//
// Aplicado ya en producción vía Neon MCP (Sesión 29). Este script queda
// como referencia idéntica al cambio ya aplicado.

async function main() {
  await sql`
    ALTER TABLE encuestas_satisfaccion
      ADD COLUMN IF NOT EXISTS aprendizaje INTEGER,
      ADD COLUMN IF NOT EXISTS mejora INTEGER,
      ADD COLUMN IF NOT EXISTS recursos INTEGER
  `;
  await sql`
    ALTER TABLE encuestas_satisfaccion
      ADD CONSTRAINT encuestas_satisfaccion_aprendizaje_check CHECK (aprendizaje BETWEEN 1 AND 5)
  `.catch(() => {});
  await sql`
    ALTER TABLE encuestas_satisfaccion
      ADD CONSTRAINT encuestas_satisfaccion_mejora_check CHECK (mejora BETWEEN 1 AND 5)
  `.catch(() => {});
  await sql`
    ALTER TABLE encuestas_satisfaccion
      ADD CONSTRAINT encuestas_satisfaccion_recursos_check CHECK (recursos BETWEEN 1 AND 5)
  `.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS encuesta_evaluaciones_instructor (
      encuesta_id INTEGER NOT NULL REFERENCES encuestas_satisfaccion(id) ON DELETE CASCADE,
      instructor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      calificacion INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
      PRIMARY KEY (encuesta_id, instructor_id)
    )
  `;

  console.log('Encuesta ampliada: columnas aprendizaje/mejora/recursos + tabla encuesta_evaluaciones_instructor listas.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
