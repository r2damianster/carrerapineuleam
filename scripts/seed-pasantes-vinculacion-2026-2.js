// Importa los pasantes reales de Vinculacion del ciclo 2026-2 (Libro1.xlsx,
// subido por el usuario a la raiz del repo) -- 20 estudiantes de 7mo/9no nivel,
// cada uno asignado a un lugar de practica con su docente supervisor real.
// Antes de esta sesion espacios_ensenanza(area='vinculacion') solo tenia
// la fila de prueba QA (id=2) -- estos son los primeros espacios reales.
//
// Docentes supervisores (ya confirmados en usuarios/lib/data.ts, no adivinados):
//   Jorge Corral Joniaux -> jorge.corral@uleam.edu.ec    (usuarios.id=18)
//   Betty Marisol Yanez  -> marisol.yanez@uleam.edu.ec   (usuarios.id=29)
//   Arturo Rodriguez     -> arturo.rodriguez@uleam.edu.ec (usuarios.id=1)
//
// Ninguno de estos 20 se marca con horas de investigacion por defecto -- el
// Excel no lo indica, el profesor lo activa luego desde /vinculacion/pasantes
// para quien corresponda.
//
// node --env-file=.env.local scripts/seed-pasantes-vinculacion-2026-2.js
//
// Ya ejecutado (datos en Neon). Libro1.xlsx se borro del repo despues de
// importar (traia nombres/correos reales de estudiantes) -- este script
// queda como referencia de lo que se hizo, no se puede re-correr tal cual.
import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';

const DOCENTE_ID = {
  'Mg. Jorge Corral Jonioux.': 18,
  'Mg. Betty Marisol Yánez García.': 29,
  'Dr. Arturo Rpdríguez Zambrano.': 1,
};

const CICLO_ID = 6; // 2026-2

// Espacios normales + rango de invisibles Unicode que trae este Excel
// (word-joiner U+2060 confirmado en la celda de Dixiana Rojas, mas el resto
// de zero-width/control chars habituales al pegar desde Word/Excel). Se
// arma con new RegExp(string) a partir de escapes \\uXXXX en texto plano
// para no depender de bytes invisibles literales dentro de este archivo.
const INVISIBLES_Y_ESPACIOS = new RegExp(
  '[\\u0000-\\u001F\\u007F-\\u009F\\u00A0\\u200B-\\u200F\\u2028-\\u202F\\u2060\\uFEFF\\s]',
  'g'
);

function limpiarEmail(raw) {
  return String(raw).replace(INVISIBLES_Y_ESPACIOS, '').toLowerCase();
}

function nombreCompletoADosPartes(nombreCompleto) {
  // El Excel trae "NOMBRES APELLIDOS" en una sola celda, sin separacion
  // marcada -- se parte por mitad de palabras (mismo criterio ya usado en
  // otras cargas de este proyecto cuando no hay columnas separadas):
  // primeras 2 palabras = nombres, resto = apellidos. Se deja el texto tal
  // cual viene (incluye anotaciones como "(A1)"), sin inventar nada.
  const palabras = nombreCompleto.trim().split(/\s+/);
  const nombres = palabras.slice(0, 2).join(' ');
  const apellidos = palabras.slice(2).join(' ') || palabras[palabras.length - 1];
  return { nombres, apellidos };
}

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  const wb = XLSX.readFile('Libro1.xlsx');
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

  // 1) Crear (o reusar) un espacio por cada par (Lugar, Docente) unico.
  const espacioIdPorLugar = new Map();
  for (const fila of filas) {
    const lugar = String(fila['Lugar']).trim();
    const docente = String(fila['Docente']).trim();
    const clave = `${lugar}::${docente}`;
    if (espacioIdPorLugar.has(clave)) continue;

    const profesorId = DOCENTE_ID[docente];
    if (!profesorId) {
      throw new Error(`Docente sin mapear a usuarios.id: "${docente}" (lugar "${lugar}")`);
    }

    const existente = await sql`
      SELECT id FROM espacios_enseñanza
      WHERE nombre = ${lugar} AND area = 'vinculacion' AND profesor_id = ${profesorId} AND ciclo_id = ${CICLO_ID}
    `;
    let espacioId;
    if (existente.length > 0) {
      espacioId = existente[0].id;
    } else {
      const [creado] = await sql`
        INSERT INTO espacios_enseñanza (nombre, tipo, ciclo_id, profesor_id, area)
        VALUES (${lugar}, 'comunidad', ${CICLO_ID}, ${profesorId}, 'vinculacion')
        RETURNING id
      `;
      espacioId = creado.id;
    }
    espacioIdPorLugar.set(clave, espacioId);
    console.log(`Espacio "${lugar}" (${docente}) -> id ${espacioId}`);
  }

  // 2) Crear cada pasante (si el email no existe ya) y asignarlo como
  //    instructor de su espacio.
  const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
  let creados = 0;
  let yaExistian = 0;

  for (const fila of filas) {
    const lugar = String(fila['Lugar']).trim();
    const docente = String(fila['Docente']).trim();
    const nombreCompleto = String(fila['Estudiantes Séptimo y Noveno nivel ']).trim();
    const email = limpiarEmail(fila['Correo Institucional']);
    const { nombres, apellidos } = nombreCompletoADosPartes(nombreCompleto);
    const espacioId = espacioIdPorLugar.get(`${lugar}::${docente}`);

    const existente = await sql`SELECT id FROM usuarios WHERE email = ${email}`;
    let usuarioId;
    if (existente.length > 0) {
      usuarioId = existente[0].id;
      yaExistian++;
      console.log(`Ya existia: ${nombreCompleto} <${email}> (id ${usuarioId})`);
    } else {
      const [nuevo] = await sql`
        INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado)
        VALUES (${nombres}, ${apellidos}, ${email}, ${placeholderHash}, 'estudiante', ${[]}, false)
        RETURNING id
      `;
      usuarioId = nuevo.id;
      creados++;
      console.log(`Creado: ${nombreCompleto} <${email}> (id ${usuarioId})`);
    }

    await sql`
      INSERT INTO espacio_instructores (espacio_id, usuario_id)
      VALUES (${espacioId}, ${usuarioId})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log(`\nListo. Pasantes creados: ${creados}. Ya existian: ${yaExistian}. Total filas: ${filas.length}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
