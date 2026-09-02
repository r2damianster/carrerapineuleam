import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
const sql = neon(process.env.DATABASE_URL);

// Unifica la tabla `docentes` (usada por app/utilidades: Acta Técnica, Oficios,
// Convocatorias) dentro de `usuarios` — antes eran dos catálogos de "quién es
// docente" separados. `docentes` nunca llegó a crearse en la Neon de
// producción real (el módulo estaba silenciosamente roto: el fetch a
// /utilidades/api/docentes fallaba con "relation docentes does not exist" y
// el frontend caía a un array vacío) — no hubo datos reales que migrar, así
// que se unificó desde cero directo en `usuarios` en vez de crear la tabla
// huérfana primero.
//
// Columnas nuevas, todas opcionales — no afectan el auth existente:
//   titulo_grado, post_grado, cargo_institucional, es_director, dependencia
// Una fila de `usuarios` "aparece" en los selectores de utilidades cuando
// titulo_grado IS NOT NULL (ver app/utilidades/_lib/docentes.ts).
//
// Dos tipos de fila nueva, mismo mecanismo ya usado en el resto del proyecto:
// - Docentes de PINE aún no registrados en el Portal: rol='profesor',
//   activado=false, password_hash aleatorio/inutilizable — se activan solos
//   con su email real la primera vez que inician sesión en /portal/login
//   (idéntico al alta de pasantes en app/api/estudiantes/route.ts).
// - Autoridades externas que NUNCA inician sesión (Decano, Rectora
//   Subrogante, Director DIPSB): rol=NULL (la columna ya lo permite, no se
//   tocó el CHECK constraint), activado=false para siempre, email
//   placeholder tipo *@sin-email.pine (mismo patrón que
//   app/api/beneficiarios/route.ts). Quedan invisibles para todo el
//   middleware/auth — solo existen como ficha para documentos.
//
// Todos los nombres/emails/cargos abajo fueron confirmados explícitamente
// por el usuario (nunca adivinados) en la Sesión 27, incluyendo 2
// correcciones sobre el seed original de `docentes` que nunca se aplicó:
// "María Basantes" → María Cristina Basantes Robalino; "Gonzalo Farfán" y
// "Ulbio Farfán" eran la misma persona (Ulbio Farfán Corrales); Germán
// Carrera es Coordinador de Carrera (no Director); Verónica Chávez es
// Responsable de Comisión Académica; Jackeline Terranova es actualmente
// Rectora Subrogante (no Vicerrectora Académica).
//
// Aplicado ya en producción vía Neon MCP (Sesión 27). Este script queda
// como referencia idéntica al cambio ya aplicado — no hace falta volver a
// correrlo (los INSERT son idempotentes vía ON CONFLICT / se puede
// re-ejecutar sin duplicar).

const DEPENDENCIA_PINE = 'Pedagogía de los Idiomas Nacionales y Extranjeros';

const DOCENTES_PINE_PENDIENTES_DE_REGISTRO = [
  // [nombres, apellidos, email, titulo_grado, post_grado, cargo_institucional, es_director, modulos_acceso]
  ['MARÍA CRISTINA', 'BASANTES ROBALINO', 'maria.basantes@uleam.edu.ec', 'Lic.', 'Mg.', 'Docente', false, ['investigacion', 'indicadores', 'utilidades']],
  ['GABRIEL', 'BAZURTO ALCÍVAR', 'gabriel.bazurto@uleam.edu.ec', 'Lic.', 'Mg.', 'Docente', false, []],
  ['LAURA', 'MENA SÁNCHEZ', 'laura.mena@uleam.edu.ec', 'Lic.', 'Mg.', 'Docente', false, []],
  ['ULBIO', 'FARFÁN CORRALES', 'ulbio.farfan@uleam.edu.ec', 'Lic.', 'Mg.', 'Docente', false, ['admin', 'investigacion', 'vinculacion', 'Proyecto_Internacionalizacion', 'indicadores', 'utilidades']],
  ['JORGE', 'CORRAL JONIAUX', 'jorge.corral@uleam.edu.ec', 'Lic.', 'Mg.', 'Docente', false, ['admin', 'investigacion', 'vinculacion', 'Proyecto_Internacionalizacion', 'indicadores', 'utilidades']],
  ['GERMÁN', 'CARRERA MORENO', 'german.carrera@uleam.edu.ec', 'Dr.', 'PhD.', 'Coordinador de Carrera', true, ['admin', 'investigacion', 'indicadores', 'utilidades']],
  ['VERÓNICA', 'CHÁVEZ ZAMBRANO', 'veronica.chavez@uleam.edu.ec', 'Lic.', 'Mg.', 'Responsable de Comisión Académica', false, ['admin', 'investigacion', 'indicadores', 'utilidades']],
  // Agregada después del seed inicial de Sesión 27, mismo mecanismo — no es docente sino personal
  // administrativo de la carrera, pero participa/firma los mismos documentos de /utilidades.
  ['YASMÍN', 'BERMÚDEZ VELASCO', 'yazmin.bermudez@uleam.edu.ec', 'Lic.', null, 'Secretaria de Carrera', false, []],
];

const AUTORIDADES_EXTERNAS = [
  // [nombres, apellidos, titulo_grado, post_grado, cargo_institucional, dependencia]
  ['JACKELINE', 'TERRANOVA RUIZ', 'Dra.', 'PhD.', 'Rectora Subrogante', 'ULEAM'],
  ['KLEVER ALFREDO', 'DELGADO REYES', 'Lic.', 'Mg.', 'Director', 'Dirección de Investigación, Publicaciones y Servicio Bibliográficos - ULEAM'],
  ['PEDRO', 'QUIJIJE ANCHUNDIA', 'Dr.', 'PhD.', 'Decano', 'Facultad de Educación y Turismo'],
];

async function main() {
  await sql`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS titulo_grado TEXT,
      ADD COLUMN IF NOT EXISTS post_grado TEXT,
      ADD COLUMN IF NOT EXISTS cargo_institucional TEXT,
      ADD COLUMN IF NOT EXISTS es_director BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS dependencia TEXT
  `;

  // Los 3 que ya existían como usuario real (se registraron antes de esta migración).
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

  for (const [nombres, apellidos, email, titulo_grado, post_grado, cargo_institucional, es_director, modulos_acceso] of DOCENTES_PINE_PENDIENTES_DE_REGISTRO) {
    const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
    await sql`
      INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado, titulo_grado, post_grado, cargo_institucional, es_director, dependencia)
      VALUES (${nombres}, ${apellidos}, ${email}, ${placeholderHash}, 'profesor', ${modulos_acceso}, false, ${titulo_grado}, ${post_grado}, ${cargo_institucional}, ${es_director}, ${DEPENDENCIA_PINE})
      ON CONFLICT (email) DO NOTHING
    `;
  }

  for (const [nombres, apellidos, titulo_grado, post_grado, cargo_institucional, dependencia] of AUTORIDADES_EXTERNAS) {
    const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
    const emailPlaceholder = `externo.${nombres.toLowerCase().replace(/\s+/g, '')}.${apellidos.toLowerCase().split(' ')[0]}-${Date.now()}@sin-email.pine`;
    await sql`
      INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado, titulo_grado, post_grado, cargo_institucional, es_director, dependencia)
      VALUES (${nombres}, ${apellidos}, ${emailPlaceholder}, ${placeholderHash}, NULL, '{}', false, ${titulo_grado}, ${post_grado}, ${cargo_institucional}, false, ${dependencia})
    `;
  }

  console.log('Unificación usuarios/docentes completa: columnas agregadas, 3 docentes existentes actualizados, 7 pre-altas de profesor y 3 autoridades externas sembradas.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
