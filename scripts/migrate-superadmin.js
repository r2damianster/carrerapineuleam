const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Panel /superadmin: acceso absoluto a la Neon (explorador de tablas + consola
// SQL cruda), solo para Arturo por ahora. `usuarios.modulos_acceso` es un
// text[] sin CHECK constraint (confirmado con describe_table_schema antes de
// escribir esto) — agregar el valor 'superadmin' no requiere ALTER de schema,
// solo el UPDATE de abajo. El gate real vive en código
// (lib/superadmin-auth.ts: SUPERADMIN_EMAILS hardcodeado + modulos_acceso),
// no solo en la columna — así aunque alguien manipule usuarios desde este
// mismo panel, sin tocar el repo no gana acceso.
//
// superadmin_audit_log registra cada acción del panel (SQL crudo o
// insert/update/delete del grid) — trazabilidad, no bloquea nada.

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS superadmin_audit_log (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER,
      actor_email TEXT NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tipo_accion TEXT NOT NULL CHECK (tipo_accion IN ('sql', 'crud_insert', 'crud_update', 'crud_delete')),
      tabla_afectada TEXT,
      detalle TEXT NOT NULL,
      resultado TEXT
    )
  `;

  await sql`
    UPDATE usuarios
    SET modulos_acceso = array_append(modulos_acceso, 'superadmin')
    WHERE email = 'arturo.rodriguez@uleam.edu.ec'
      AND NOT ('superadmin' = ANY(modulos_acceso))
  `;

  console.log('superadmin_audit_log creada, superadmin otorgado a arturo.rodriguez@uleam.edu.ec');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
