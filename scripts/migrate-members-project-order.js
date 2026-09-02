import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// `members.order` es global (define el orden en /investigacion/proyecto-innovacion,
// la página de Internacionalización) — pero un miembro puede necesitar un orden
// distinto dentro del equipo de OTRO proyecto donde también aparece (ver
// members.projects, Sesión 26). Ej: en Vinculación, Cynthia (líder) debe ir antes
// que Arturo (supervisor), aunque en Internacionalización Arturo va primero.
//
// Agrega `project_order` (JSONB, ej. {"vinculacion": 2}) como override opcional,
// consumido por GET /api/members?project=X (ver app/api/members/route.ts).

const PROJECT_ORDER_OVERRIDES = {
  member_11: { vinculacion: 1 }, // Cynthia Zambrano — líder de Vinculación, va primera ahí
  member_1: { vinculacion: 2 }, // Arturo Rodríguez — supervisor en Vinculación, va segundo ahí
  member_10: { desarrollo_habilidades: 1 }, // German Carrera — líder, va primero en Lingüística
  member_3: { desarrollo_habilidades: 2 }, // Cristina Basantes — colídera, va segunda en Lingüística
};

async function run() {
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS project_order JSONB NOT NULL DEFAULT '{}'`;

  for (const [id, overrides] of Object.entries(PROJECT_ORDER_OVERRIDES)) {
    const res = await sql`UPDATE members SET project_order = ${JSON.stringify(overrides)}::jsonb WHERE id = ${id} RETURNING id`;
    if (res.length === 0) console.warn(`Aviso: no se encontró member ${id}`);
  }

  const rows = await sql`SELECT id, name, projects, project_order FROM members ORDER BY "order" ASC`;
  console.log('members.project_order actualizado:');
  for (const r of rows) console.log(` - ${r.id}: ${r.name} -> projects:[${r.projects.join(', ')}] project_order:${JSON.stringify(r.project_order)}`);
}
run().catch(e => { console.error(e); process.exit(1); });
