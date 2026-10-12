// Permisos de Contribuciones: editar solo autor/coautor (o superadmin), eliminar solo
// superadmin o líder/colíder del proyecto. Aditivo — nunca `prisma db push`.
//  - Contribution.proyectoId: proyectos.id (lo deriva el servidor del nombre oficial).
//  - ContributionAuthor.usuarioId: usuarios.id del docente autor.
// Backfill: proyecto vacío → Innovaciones Pedagógicas e Internacionalización (confirmado por
// el usuario, 2026-10-12); proyectoId desde el nombre oficial; usuarioId por nombre completo
// (todas las palabras del autor contenidas en nombres+apellidos, solo si es coincidencia única).
// Ejecutar: node --env-file=.env.local scripts/migrate-contribuciones-permisos.js
import { neon } from '@neondatabase/serverless';

const NOMBRE_INTERNACIONALIZACION =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "proyectoId" TEXT`;
  await sql`ALTER TABLE "ContributionAuthor" ADD COLUMN IF NOT EXISTS "usuarioId" INTEGER`;

  await sql`UPDATE "Contribution" SET proyecto = ${NOMBRE_INTERNACIONALIZACION} WHERE proyecto IS NULL`;
  await sql`UPDATE "Contribution" SET "proyectoId" = 'internacionalizacion'
            WHERE "proyectoId" IS NULL AND proyecto = ${NOMBRE_INTERNACIONALIZACION}`;

  const autores = await sql`
    SELECT a.id, a."authorName" FROM "ContributionAuthor" a
    WHERE a."usuarioId" IS NULL AND a."isCarreraAuthor" = true AND a."esEstudiante" = false`;
  const docentes = await sql`SELECT id, nombres, apellidos FROM usuarios WHERE rol IN ('profesor','admin')`;
  const normalizar = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().split(/\s+/);
  const directorio = docentes.map(d => ({ id: d.id, tokens: normalizar(`${d.nombres} ${d.apellidos}`) }));

  let asignados = 0;
  for (const autor of autores) {
    const tokens = normalizar(autor.authorName);
    if (tokens.length < 2) continue;
    const coincidencias = directorio.filter(d => tokens.every(t => d.tokens.includes(t)));
    if (coincidencias.length !== 1) { console.log('SIN ASIGNAR:', autor.authorName); continue; }
    await sql`UPDATE "ContributionAuthor" SET "usuarioId" = ${coincidencias[0].id} WHERE id = ${autor.id}`;
    asignados++;
  }
  console.log(`OK. Autores con usuarioId: ${asignados}/${autores.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
