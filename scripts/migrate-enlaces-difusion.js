const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Tabla para "acceso temporal de difusión": un profesor con módulo
// vinculacion/investigacion (o contenido_sitio) genera un enlace/QR sin
// login para que alguien SIN cuenta en el Portal (estudiante externo,
// colaborador puntual de un evento) registre un evento o podcast en
// actividades_difusion. A diferencia de enlaces_evaluacion (Sesión 28), no
// hay espacio/beneficiario involucrado — es el mismo formulario que ya usa
// /gestion-carrera, solo que sin sesión.
//
// Regla dura, forzada en el servidor (no en esta migración): cualquier fila
// insertada vía este flujo nace con origen='externo_temporal' y
// aprobado_sitio=false (default de columna) — nunca se auto-aprueba, cae en
// la misma cola de moderación de /admin/contenido que el resto de difusión.
//
// registrador_id de actividades_difusion queda NULL en estas filas (ya era
// nullable) — en su lugar se guardan registrador_externo_nombre/contacto
// (columnas nuevas, ver ALTER abajo) para trazabilidad sin crear un usuario.

async function main() {
  await sql`
    ALTER TABLE actividades_difusion
      ADD COLUMN IF NOT EXISTS registrador_externo_nombre text,
      ADD COLUMN IF NOT EXISTS registrador_externo_contacto text
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS enlaces_difusion (
      token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      creado_por integer NOT NULL REFERENCES usuarios(id),
      nombre_invitado text NOT NULL,
      expira_en timestamptz NOT NULL,
      max_usos integer,
      usos_actuales integer NOT NULL DEFAULT 0,
      activo boolean NOT NULL DEFAULT true,
      creado_en timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS enlaces_difusion_creado_por_idx ON enlaces_difusion (creado_por)`;

  console.log('actividades_difusion.registrador_externo_* + tabla enlaces_difusion creadas/verificadas.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
