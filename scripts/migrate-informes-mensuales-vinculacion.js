// Amplía informes_vinculacion.tipo para el informe MENSUAL (Sesión 57), adicional al
// semestral existente ('lider'/'supervisor'). Nuevos valores: 'lider-mensual', 'supervisor-mensual'.
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`ALTER TABLE informes_vinculacion DROP CONSTRAINT informes_vinculacion_tipo_check`;
  await sql`
    ALTER TABLE informes_vinculacion ADD CONSTRAINT informes_vinculacion_tipo_check
    CHECK (tipo = ANY (ARRAY['lider', 'supervisor', 'lider-mensual', 'supervisor-mensual']))
  `;

  console.log('Migración completada: informes_vinculacion.tipo acepta lider-mensual/supervisor-mensual.');
}

main();
