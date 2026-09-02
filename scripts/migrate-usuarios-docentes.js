import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Unifica la tabla `docentes` (usada por app/utilidades: Acta Técnica, Oficios,
// Convocatorias) dentro de `usuarios` — antes eran dos catálogos de "quién es
// docente" separados. `docentes` nunca llegó a crearse en la Neon de
// producción real (el módulo estaba silenciosamente roto: el fetch a
// /utilidades/api/docentes fallaba con "relation docentes does not exist" y
// el frontend caía a un array vacío) — no hubo datos reales que migrar, así
// que se unifica desde cero directo en `usuarios` en vez de crear la tabla
// huérfana primero.
//
// Columnas nuevas, todas opcionales — no afectan el auth existente:
//   titulo_grado, post_grado, cargo_institucional, es_director, dependencia
// Una fila de `usuarios` "aparece" en los selectores de utilidades cuando
// titulo_grado IS NOT NULL (ver app/utilidades/_lib/docentes.ts).
//
// Autoridades externas que nunca inician sesión (Decano, Vicerrectora, etc.)
// se representan con rol = NULL (la columna ya lo permite, no se tocó el
// CHECK constraint) y activado = false — quedan invisibles para el
// middleware/auth, solo existen como ficha para documentos. Docentes de PINE
// aún no registrados se pre-cargan con el mismo mecanismo que los pasantes
// (activado = false, se activan solos en su primer login real) — requiere su
// email real confirmado, nunca inventado.
//
// Aplicado ya en producción vía Neon MCP (Sesión 27) para las 3 personas con
// email 100% confirmado en lib/data.ts:profesoresAutorizados que ya existían
// como fila real en `usuarios`. Este script queda como referencia idéntica al
// cambio ya aplicado — no hace falta volver a correrlo.

async function main() {
  await sql`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS titulo_grado TEXT,
      ADD COLUMN IF NOT EXISTS post_grado TEXT,
      ADD COLUMN IF NOT EXISTS cargo_institucional TEXT,
      ADD COLUMN IF NOT EXISTS es_director BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS dependencia TEXT
  `;

  const DEPENDENCIA_PINE = 'Pedagogía de los Idiomas Nacionales y Extranjeros';

  await sql`
    UPDATE usuarios
    SET titulo_grado = 'Dr.', post_grado = 'PhD.', cargo_institucional = 'Docente', dependencia = ${DEPENDENCIA_PINE}
    WHERE email IN ('arturo.rodriguez@uleam.edu.ec', 'jhonny.villafuerte@uleam.edu.ec')
  `;
  await sql`
    UPDATE usuarios
    SET titulo_grado = 'Lic.', post_grado = 'Mg.', cargo_institucional = 'Docente', dependencia = ${DEPENDENCIA_PINE}
    WHERE email = 'cintya.zambrano@uleam.edu.ec'
  `;

  console.log('Columnas agregadas a usuarios y 3 docentes ya confirmados actualizados.');
  console.log('Pendiente (requiere confirmar datos con el usuario antes de insertar):');
  console.log('- Pre-alta de Germán Carrera y Verónica Chávez (ya en profesoresAutorizados, aún sin fila en usuarios)');
  console.log('- Autoridades externas para Acta Técnica/Oficios (Decano, Vicerrectora, Director DIPSB) — rol=NULL');
  console.log('- Identidades ambiguas del seed viejo de "docentes" nunca aplicado (María/Cristina Basantes, Gonzalo/Ulbio Farfán, Gabriel Bazurto, Laura Mena) — sin email confirmado');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
