import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`INSERT INTO ciclos_academicos (nombre, fecha_inicio, fecha_fin) VALUES ('Semestre 2024-I', '2024-03-01', '2024-08-31')`;
    console.log('Ciclo insertado');
  } catch (error) {
    console.error(error);
  }
}

run();
