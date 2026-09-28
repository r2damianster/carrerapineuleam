const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Completa 2 huecos reales de la ficha del proyecto de Vinculación, encontrados al revisar
// el Informe Semestral del Supervisor y del Líder:
// - proyectos.ods / linea_investigacion: nunca se habían cargado, quedaban vacíos en el .docx
//   del líder (el del supervisor ni siquiera los leía todavía, corregido en la misma sesión).
//   Valores dados explícitamente por el usuario (ODS relativo a educación; línea de
//   investigación única de todos los proyectos del grupo).
// - proyectos.firmante_responsable_id: la columna ya existía (Sesión ~52), pero nadie había
//   seleccionado a Mg. Emil Viera Manzo (Responsable de Vinculación y Emprendimiento) porque
//   el selector de /vinculacion/proyecto solo mostraba docentes ya ACTIVADOS (rol IN
//   ('profesor','admin') AND activado=true) — un docente "pre-alta" (activado=false, mismo
//   patrón de scripts/migrate-usuarios-docentes.js) nunca aparecía ahí. Se agrega la persona
//   Y se corrige ese filtro en app/vinculacion/proyecto/api/route.ts en la misma sesión.
//
// Email confirmado explícitamente por el usuario (nunca adivinado): emil.viera@uleam.edu.ec.
//
// Aplicado ya en producción vía Neon MCP (2026-09-28). Este script queda como referencia
// idéntica al cambio aplicado — no hace falta volver a correrlo.

async function main() {
  const [emil] = await sql`
    INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado, titulo_grado, post_grado, cargo_institucional, es_director, dependencia)
    VALUES ('EMIL', 'VIERA MANZO', 'emil.viera@uleam.edu.ec', md5(gen_random_uuid()::text), 'profesor', '{}', false, 'Mg.', NULL, 'Responsable de Vinculación y Emprendimiento', false, 'ULEAM')
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;
  const emilId = emil?.id ?? (await sql`SELECT id FROM usuarios WHERE email = 'emil.viera@uleam.edu.ec'`)[0].id;

  await sql`
    UPDATE proyectos SET
      ods = 'ODS 4: Educación de Calidad',
      linea_investigacion = 'Educación y Nuevos Escenarios de la Formación Profesional',
      firmante_responsable_id = ${emilId}
    WHERE id = 'vinculacion'
  `;

  console.log('Ficha del proyecto de Vinculación completada: ODS, línea de investigación y firmante responsable.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
