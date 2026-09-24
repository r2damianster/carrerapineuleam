const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('--- LATEST ACTIVIDADES DIFUSION ---');
  const latestAct = await sql`
    SELECT id, titulo, fecha, categoria, tipo, descripcion, observaciones, profesores_responsables, fecha_creacion, origen, registrador_externo_nombre
    FROM actividades_difusion 
    ORDER BY id DESC 
    LIMIT 10
  `;
  console.log(JSON.stringify(latestAct, null, 2));

  console.log('\n--- GABRIEL BAZURTO ---');
  const gabriel = await sql`
    SELECT id, nombres, apellidos, rol, correo, cargo, modulos_acceso 
    FROM usuarios 
    WHERE nombres ILIKE '%Gabriel%' OR apellidos ILIKE '%Bazurto%'
  `;
  console.log(JSON.stringify(gabriel, null, 2));

  console.log('\n--- ALL DISTINCT CATEGORIAS ---');
  const categorias = await sql`SELECT DISTINCT categoria FROM actividades_difusion`;
  console.log(JSON.stringify(categorias, null, 2));

  console.log('\n--- ALL DISTINCT TIPOS ---');
  const tipos = await sql`SELECT DISTINCT tipo FROM actividades_difusion`;
  console.log(JSON.stringify(tipos, null, 2));

  console.log('\n--- TABLE COLUMNS FOR actividades_difusion ---');
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'actividades_difusion'
  `;
  console.log(cols.map(c => `${c.column_name}: ${c.data_type}`));
}

run().catch(console.error);

