import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`
  ALTER TABLE perfiles_beneficiarios
    ADD COLUMN IF NOT EXISTS edad INTEGER,
    ADD COLUMN IF NOT EXISTS tiene_discapacidad BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS tipo_discapacidad VARCHAR(255),
    ADD COLUMN IF NOT EXISTS situacion_ocupacional VARCHAR(30),
    ADD COLUMN IF NOT EXISTS rol_laboral VARCHAR(255),
    ADD COLUMN IF NOT EXISTS nivel_educativo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS carrera VARCHAR(255),
    ADD COLUMN IF NOT EXISTS curso VARCHAR(100)
`;

await sql`ALTER TABLE perfiles_beneficiarios DROP COLUMN IF EXISTS situacion_laboral`;

console.log('perfiles_beneficiarios actualizado');
