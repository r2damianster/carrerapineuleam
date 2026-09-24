const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('--- ESPACIOS INSTRUCTORES ---');
  const instructores = await sql`
    SELECT ei.espacio_id, e.nombre AS espacio_nombre, e.area, u.id AS pasante_id, u.nombres, u.apellidos, u.rol
    FROM espacio_instructores ei
    JOIN espacios e ON e.id = ei.espacio_id
    JOIN usuarios u ON u.id = ei.usuario_id
    ORDER BY e.nombre, u.apellidos;
  `;
  console.log(JSON.stringify(instructores, null, 2));

  console.log('\n--- ESPACIOS CREADOR / PROFESOR ---');
  const espaciosProf = await sql`
    SELECT e.id, e.nombre, e.area, e.creador_id, u.nombres AS creador_nombres, u.apellidos AS creador_apellidos
    FROM espacios e
    LEFT JOIN usuarios u ON u.id = e.creador_id;
  `;
  console.log(JSON.stringify(espaciosProf, null, 2));

  console.log('\n--- USUARIOS COLUMNS ---');
  const userCols = await sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios'
  `;
  console.log(userCols.map(c => c.column_name));

  console.log('\n--- ESTUDIANTES PERFILES / COLUMNS ---');
  const estCols = await sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'estudiantes'
  `;
  console.log(estCols.map(c => c.column_name));
}

run().catch(console.error);
