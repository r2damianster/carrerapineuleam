const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('1. Actualizando evento ID 32 a categoria maestria...');
  const resEv = await sql`
    UPDATE actividades_difusion
    SET categoria = 'maestria'
    WHERE id = 32
    RETURNING id, titulo, categoria;
  `;
  console.log('Evento actualizado:', resEv);

  console.log('2. Actualizando cargo de Gabriel Bazurto (ID 15)...');
  const resUsr = await sql`
    UPDATE usuarios
    SET cargo_institucional = 'Docente / Coordinador de la Maestría en Pedagogía de los Idiomas Nacionales y Extranjeros'
    WHERE id = 15
    RETURNING id, nombres, apellidos, cargo_institucional;
  `;
  console.log('Usuario actualizado:', resUsr);
}

run().catch(console.error);

