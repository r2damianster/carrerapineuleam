import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function alterDB() {
  console.log('Altering usuarios table to add modulos_acceso...');

  try {
    // Add column if it doesn't exist
    await sql`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS modulos_acceso TEXT[] DEFAULT '{}'
    `;
    console.log('Column added successfully.');

    // Update specific users
    await sql`UPDATE usuarios SET modulos_acceso = '{"vinculacion"}' WHERE email = 'cintya.zambrano@uleam.edu.ec'`;
    await sql`UPDATE usuarios SET modulos_acceso = '{"vinculacion", "investigacion", "admin"}' WHERE email = 'arturo.rodriguez@uleam.edu.ec'`;
    await sql`UPDATE usuarios SET modulos_acceso = '{"investigacion", "admin"}' WHERE email = 'german.carrera@uleam.edu.ec'`;
    await sql`UPDATE usuarios SET modulos_acceso = '{"investigacion", "difusion"}' WHERE email = 'cristina.basantes@uleam.edu.ec'`;
    await sql`UPDATE usuarios SET modulos_acceso = '{"investigacion"}' WHERE email = 'johana.bello@uleam.edu.ec'`;
    await sql`UPDATE usuarios SET modulos_acceso = '{"investigacion", "comision_academica"}' WHERE email = 'veronika@uleam.edu.ec'`;

    // Also update any generic "estudiante" or "beneficiario" logic for testing if needed
    // But for now, just the explicitly mentioned ones.

    console.log('Users updated with their respective modules!');
  } catch (error) {
    console.error('Error altering DB:', error);
  }
}

alterDB().catch(console.error);
