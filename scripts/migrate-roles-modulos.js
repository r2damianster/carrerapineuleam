// Asigna los módulos de acceso definidos en la Sesión 50 (modelo de roles por módulo, ver lib/modulos.ts).
// Deja fuera los valores basura que ningún código lee (Proyecto_Internacionalizacion, indicadores, utilidades).
// Los pasantes no se tocan. Desde aquí en adelante los módulos se editan en /admin/roles.
// node --env-file=.env.local scripts/migrate-roles-modulos.js
import { neon } from '@neondatabase/serverless';

const MODULOS_POR_EMAIL = {
  'arturo.rodriguez@uleam.edu.ec': ['admin', 'contenido_sitio', 'investigacion', 'vinculacion', 'vinculacion_gestion', 'superadmin'],
  'cintya.zambrano@uleam.edu.ec': ['vinculacion', 'vinculacion_gestion'],
  'jhonny.villafuerte@uleam.edu.ec': [],
  'maria.basantes@uleam.edu.ec': [],
  'gabriel.bazurto@uleam.edu.ec': [],
  'laura.mena@uleam.edu.ec': [],
  'ulbio.farfan@uleam.edu.ec': [],
  'jorge.corral@uleam.edu.ec': ['vinculacion'],
  'german.carrera@uleam.edu.ec': ['investigacion'],
  'veronica.chavez@uleam.edu.ec': ['investigacion'],
  'yazmin.bermudez@uleam.edu.ec': [],
  'marisol.yanez@uleam.edu.ec': ['vinculacion'],
};

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  for (const [email, modulos] of Object.entries(MODULOS_POR_EMAIL)) {
    const filas = await sql`UPDATE usuarios SET modulos_acceso = ${modulos} WHERE email = ${email} RETURNING id`;
    console.log(email, filas.length ? 'OK' : 'NO ENCONTRADO', modulos);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
