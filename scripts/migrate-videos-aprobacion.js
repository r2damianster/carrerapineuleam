import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Cola de aprobación para videos propuestos por profesores desde
// app/portal/subir-video (suben directo a YouTube como "no listado" vía la API,
// luego el registro en `videos` nace con aprobado_sitio=false hasta que
// contenido_sitio lo aprueba/rechaza en /admin/videos). Mismo patrón que
// actividades_difusion.aprobado_sitio — a diferencia de members.pending_*, aquí
// es una fila NUEVA que todavía no existe públicamente, no una edición de una
// fila ya publicada, así que no hace falta duplicar columnas pending_*.
//
// DEFAULT true preserva los videos ya existentes (creados directo por admin)
// como ya públicos — cero cambio de comportamiento para lo que ya hay.

async function migrate() {
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS aprobado_sitio BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS propuesto_por INTEGER REFERENCES usuarios(id)`;
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS aprobado_por INTEGER REFERENCES usuarios(id)`;
  await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ`;
  console.log('Migración completada: videos.aprobado_sitio/propuesto_por/aprobado_por/fecha_aprobacion');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
