const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Enlaces/QR públicos para que alguien SIN cuenta envíe una contribución académica
// (artículo, libro, capítulo, memoria, propiedad intelectual). Solo un docente
// (rol profesor/admin) los genera. El docente fija el tipo de publicación y,
// opcionalmente, su propia fila de autor (nombre + orden) para que llegue precargada.
//
// Reglas duras, forzadas en el servidor: todo envío por enlace nace con
// origen='enlace_externo' y aprobada=false. Las filas existentes (cargadas por
// docentes) quedan aprobada=true por el DEFAULT. Las estadísticas solo cuentan aprobadas.
//
// NO usar `prisma db push`/`migrate` (ver CLAUDE.md): este script es aditivo y manual.

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS enlaces_contribucion (
      token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      creado_por integer NOT NULL REFERENCES usuarios(id),
      nombre_invitado text NOT NULL,
      tipo_publicacion text NOT NULL CHECK (tipo_publicacion IN (
        'ARTICULO_REGIONAL','ARTICULO_ALTO_IMPACTO','LIBRO','CAPITULO_LIBRO','MEMORIA_EVENTO','PROPIEDAD_INTELECTUAL'
      )),
      docente_es_autor boolean NOT NULL DEFAULT false,
      docente_orden integer CHECK (docente_orden BETWEEN 1 AND 5),
      expira_en timestamptz NOT NULL,
      max_usos integer,
      usos_actuales integer NOT NULL DEFAULT 0,
      activo boolean NOT NULL DEFAULT true,
      creado_en timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT enlaces_contribucion_orden_si_autor CHECK (NOT docente_es_autor OR docente_orden IS NOT NULL)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS enlaces_contribucion_creado_por_idx ON enlaces_contribucion (creado_por)`;

  await sql`
    ALTER TABLE "Contribution"
      ADD COLUMN IF NOT EXISTS "origen" text NOT NULL DEFAULT 'docente',
      ADD COLUMN IF NOT EXISTS "aprobada" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "registradorExternoNombre" text,
      ADD COLUMN IF NOT EXISTS "registradorExternoContacto" text
  `;

  console.log('enlaces_contribucion + Contribution.origen/aprobada/registradorExterno* creados/verificados.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
