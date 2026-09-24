import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Archivo .env.local no encontrado en: ${envPath}`);
  }
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      return line.split('DATABASE_URL=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  throw new Error("Variable DATABASE_URL no encontrada en .env.local");
}

const sql = neon(getDatabaseUrl());

async function buscarEstudiante(query) {
  console.log(`\n🔍 Buscando estudiante/usuario con término: "${query}"...`);

  const term = `%${query}%`;

  let byId = [];
  if (!isNaN(query)) {
    byId = await sql`SELECT id, nombres, apellidos, email, cedula, rol, activado, password_hash IS NOT NULL as tiene_password, creado_en FROM usuarios WHERE id = ${parseInt(query)}`;
  }

  const byText = await sql`
    SELECT id, nombres, apellidos, email, cedula, rol, activado, password_hash IS NOT NULL as tiene_password, creado_en 
    FROM usuarios 
    WHERE email ILIKE ${term} 
       OR nombres ILIKE ${term} 
       OR apellidos ILIKE ${term} 
       OR (cedula IS NOT NULL AND cedula ILIKE ${term})
  `;

  const map = new Map();
  [...byId, ...byText].forEach(u => map.set(u.id, u));
  const resultados = Array.from(map.values());

  if (resultados.length === 0) {
    console.log("❌ No se encontraron usuarios que coincidan con la búsqueda.");
    return;
  }

  console.log(`\n✅ Se encontraron ${resultados.length} registro(s):`);
  console.table(resultados);
}

async function verVinculacion(query) {
  console.log(`\n📚 Consultando datos de Vinculación para: "${query}"...`);

  let user = null;
  if (!isNaN(query)) {
    const res = await sql`SELECT * FROM usuarios WHERE id = ${parseInt(query)}`;
    user = res[0];
  } else {
    const res = await sql`SELECT * FROM usuarios WHERE email ILIKE ${query} OR cedula ILIKE ${query} LIMIT 1`;
    user = res[0];
  }

  if (!user) {
    console.log("❌ Usuario no encontrado.");
    return;
  }

  console.log(`\n👤 Estudiante: ${user.nombres} ${user.apellidos} (ID: ${user.id}, Email: ${user.email})`);

  const espaciosInstr = await sql`
    SELECT ei.espacio_id, ee.nombre AS espacio_nombre, ee.tipo, ee.area, ee.profesor_id, ca.nombre AS ciclo
    FROM espacio_instructores ei
    JOIN espacios_enseñanza ee ON ei.espacio_id = ee.id
    LEFT JOIN ciclos_academicos ca ON ee.ciclo_id = ca.id
    WHERE ei.usuario_id = ${user.id}
  `;

  if (espaciosInstr.length > 0) {
    console.log("\n🏫 Espacios asignados como Instructor/Pasante:");
    console.table(espaciosInstr);
  } else {
    console.log("\nℹ️ No tiene espacios asignados como instructor de vinculación.");
  }

  const actividades = await sql`SELECT * FROM actividades_investigacion_pasante WHERE usuario_id = ${user.id}`;
  if (actividades.length > 0) {
    console.log("\n📝 Actividades registradas:");
    console.table(actividades);
  }

  const podcast = await sql`SELECT * FROM horas_podcast_pasante WHERE usuario_id = ${user.id}`;
  if (podcast.length > 0) {
    console.log("\n🎙️ Horas de podcast registradas:");
    console.table(podcast);
  }

  process.exit(0);
}

async function resetPassword(query, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    console.log("❌ Error: La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  console.log(`\n🔑 Reseteando contraseña para "${query}" a "${newPassword}"...`);

  let userId = null;
  if (!isNaN(query)) {
    userId = parseInt(query);
  } else {
    const res = await sql`SELECT id FROM usuarios WHERE email ILIKE ${query} LIMIT 1`;
    if (res.length > 0) userId = res[0].id;
  }

  if (!userId) {
    console.log("❌ No se encontró el usuario especificado.");
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  const updated = await sql`
    UPDATE usuarios 
    SET password_hash = ${newHash}, activado = true 
    WHERE id = ${userId} 
    RETURNING id, nombres, apellidos, email, rol, activado
  `;

  console.log("✅ Contraseña actualizada exitosamente:");
  console.table(updated);

  const check = await sql`SELECT password_hash FROM usuarios WHERE id = ${userId}`;
  const valid = await bcrypt.compare(newPassword, check[0].password_hash);
  console.log(`🔐 Verificación de login con la nueva clave: ${valid ? 'EXITOSA (MATCH OK)' : 'FALLIDA'}`);

  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  const comando = args[0];

  if (!comando) {
    console.log(`
Uso del script de Gestión de Estudiantes:
  node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs buscar <query>
  node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs vinculacion <query>
  node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs reset-password <query> <nueva_clave>

Ejemplos:
  node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs buscar 1314687524
  node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs vinculacion estudiante@live.uleam.edu.ec
  node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs reset-password estudiante@live.uleam.edu.ec <NuevaClaveTemporal>
`);
    process.exit(0);
  }

  if (comando === 'buscar') {
    await buscarEstudiante(args[1]);
  } else if (comando === 'vinculacion') {
    await verVinculacion(args[1]);
  } else if (comando === 'reset-password') {
    await resetPassword(args[1], args[2]);
  } else {
    console.log(`❌ Comando no reconocido: ${comando}`);
  }
}

main().catch(err => {
  console.error("❌ Error ejecutando script:", err.message);
  process.exit(1);
});

