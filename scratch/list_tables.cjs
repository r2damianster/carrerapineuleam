const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  console.log('Tablas en Neon:', tables.map(t => t.table_name));

  const userCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'usuarios'
  `;
  console.log('Usuarios columns:', userCols);
}

run().catch(console.error);

