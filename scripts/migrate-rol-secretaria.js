// Agrega el rol 'secretaria' (solo Mi Perfil + /utilidades) y lo asigna a Yasmín Bermúdez.
// Aplicado en producción vía Neon MCP. Idempotente.
// Requiere ampliar usuarios_rol_check en la MISMA migración (lección de "Ver como": tsc/build no ven CHECKs).
const { neon } = require('@neondatabase/serverless');
(async () => {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check`;
  await sql`ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol::text = ANY (ARRAY['admin','profesor','estudiante','beneficiario','secretaria']::text[]))`;
  await sql`UPDATE usuarios SET rol = 'secretaria', modulos_acceso = '{}' WHERE email = 'yazmin.bermudez@uleam.edu.ec'`;
  console.log('OK');
})();
