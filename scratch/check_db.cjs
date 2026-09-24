const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  const userCols = await sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios'
  `;
  console.log('Usuarios columns:', userCols.map(c => c.column_name));

  console.log('\n--- GABRIEL BAZURTO ---');
  const gabriel = await sql`
    SELECT *
    FROM usuarios 
    WHERE nombres ILIKE '%Gabriel%' OR apellidos ILIKE '%Bazurto%'
  `;
  console.log(JSON.stringify(gabriel, null, 2));

  console.log('\n--- ALL USUARIOS (roles / cargos) ---');
  const docentes = await sql`
    SELECT id, nombres, apellidos, rol, cargo, modulos_acceso
    FROM usuarios 
    WHERE rol = 'profesor' OR rol = 'admin'
  `;
  console.log(JSON.stringify(docentes, null, 2));
}

run().catch(console.error);

