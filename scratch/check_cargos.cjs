const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const cargos = await sql`SELECT id, nombres, apellidos, cargo_institucional FROM usuarios WHERE rol = 'profesor' OR rol = 'admin'`;
  console.log('Cargos actuales:', cargos);
}

run().catch(console.error);

