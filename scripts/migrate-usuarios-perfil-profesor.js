import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Campos nuevos en `usuarios`, solo usados por el autoregistro de profesor
// (/registro, POST /api/auth/register). No aplica a pasantes (activación
// diferida) ni a beneficiarios (nunca tienen cuenta) — decisión explícita
// del usuario, Sesión 29.
//
//   cedula            VARCHAR(10), UNIQUE, NULL permitido (filas ya
//                      existentes no la tienen)
//   orcid             VARCHAR(50), opcional
//   genero            VARCHAR(20)
//   fecha_nacimiento  DATE

async function migrate() {
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cedula VARCHAR(10)`;
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS orcid VARCHAR(50)`;
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS genero VARCHAR(20)`;
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_cedula_unique'
      ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_cedula_unique UNIQUE (cedula);
      END IF;
    END $$;
  `;
  console.log('Migración completada: usuarios.cedula/orcid/genero/fecha_nacimiento');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
