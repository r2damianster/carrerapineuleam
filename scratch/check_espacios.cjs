const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  const espacios = await sql`
    SELECT ee.id, ee.nombre, ee.area, ee.profesor_id, u.nombres AS profesor_nombres, u.apellidos AS profesor_apellidos
    FROM "espacios_enseñanza" ee
    LEFT JOIN usuarios u ON u.id = ee.profesor_id
  `;
  console.log('Espacios:', JSON.stringify(espacios, null, 2));

  const ei = await sql`
    SELECT ei.espacio_id, ee.nombre AS espacio_nombre, ee.profesor_id, prof.nombres AS profesor_nombre, prof.apellidos AS profesor_apellido, pas.id AS pasante_id, pas.nombres AS pasante_nombres, pas.apellidos AS pasante_apellidos
    FROM espacio_instructores ei
    JOIN "espacios_enseñanza" ee ON ee.id = ei.espacio_id
    LEFT JOIN usuarios prof ON prof.id = ee.profesor_id
    JOIN usuarios pas ON pas.id = ei.usuario_id
  `;
  console.log('\nPasantes por Espacio y Profesor:', JSON.stringify(ei, null, 2));
}

run().catch(console.error);

