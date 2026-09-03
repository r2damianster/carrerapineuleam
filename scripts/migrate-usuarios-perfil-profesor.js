import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Campo nuevo en `usuarios`, usado solo por el autoregistro de profesor
// (/registro, POST /api/auth/register). No aplica a pasantes (activación
// diferida) ni a beneficiarios (nunca tienen cuenta) — decisión explícita
// del usuario, Sesión 29.
//
//   cedula  VARCHAR(10), UNIQUE, NULL permitido (filas ya existentes no
//           la tienen) — dato privado, NUNCA se expone en `members`
//           (tarjeta pública del equipo).
//
// ⚠️ orcid/genero/fecha_nacimiento NO viven aquí — se decidió después,
// misma sesión, que son datos de la tarjeta pública y viven en `members`
// (ver scripts/migrate-members-perfil-academico.js). Este script solo
// agrega `cedula`; una versión anterior de este mismo archivo agregaba
// también orcid/genero/fecha_nacimiento a usuarios — quedó obsoleta y fue
// corregida en la misma sesión (Sesión 29) antes de dejar rastro real en
// otros entornos.

async function migrate() {
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cedula VARCHAR(10)`;
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
  console.log('Migración completada: usuarios.cedula');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
