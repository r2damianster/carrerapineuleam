import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

async function seedRoles() {
  const usersToSeed = [
    {
      nombres: 'German',
      apellidos: 'Carrera Moreno',
      email: 'german.carrera@uleam.edu.ec', // Example email
      rol: 'profesor'
    },
    {
      nombres: 'Cristina',
      apellidos: 'Basantes',
      email: 'cristina.basantes@uleam.edu.ec',
      rol: 'profesor'
    },
    {
      nombres: 'Cinthya',
      apellidos: 'Zambrano',
      email: 'cintya.zambrano@uleam.edu.ec', // Explicitly mentioned
      rol: 'profesor'
    },
    {
      nombres: 'Arturo',
      apellidos: 'Rodríguez',
      email: 'arturo.rodriguez@uleam.edu.ec',
      rol: 'profesor'
    },
    {
      nombres: 'Johana',
      apellidos: 'Bello',
      email: 'johana.bello@uleam.edu.ec',
      rol: 'profesor'
    },
    {
      nombres: 'Veronika',
      apellidos: 'Vera', // Or any placeholder if surname is missing
      email: 'veronika@uleam.edu.ec',
      rol: 'profesor'
    }
  ];

  console.log('Seeding administrative users...');
  
  const passwordHash = await bcrypt.hash('pineadmin2026', 10); // Default password for them

  for (const user of usersToSeed) {
    try {
      const existingUser = await sql`SELECT id FROM usuarios WHERE email = ${user.email}`;
      if (existingUser.length > 0) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      await sql`
        INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol)
        VALUES (${user.nombres}, ${user.apellidos}, ${user.email}, ${passwordHash}, ${user.rol})
      `;
      console.log(`Inserted user: ${user.nombres} (${user.email})`);
    } catch (e) {
      console.error(`Error inserting ${user.email}:`, e.message);
    }
  }
  
  console.log('Finished seeding roles!');
}

seedRoles().catch(console.error);
