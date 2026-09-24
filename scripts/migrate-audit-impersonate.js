// Amplía el CHECK de superadmin_audit_log.tipo_accion para "Ver como" (Sesión 46).
// Aplicado en producción vía Neon MCP el 2026-09-24. Idempotente.
const { neon } = require('@neondatabase/serverless');
(async () => {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE superadmin_audit_log DROP CONSTRAINT IF EXISTS superadmin_audit_log_tipo_accion_check`;
  await sql`ALTER TABLE superadmin_audit_log ADD CONSTRAINT superadmin_audit_log_tipo_accion_check CHECK (tipo_accion IN ('sql','crud_insert','crud_update','crud_delete','impersonate','impersonate_revert'))`;
  console.log('OK');
})();
