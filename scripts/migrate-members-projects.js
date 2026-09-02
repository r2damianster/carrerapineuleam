import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Agrega la columna `projects` (text[]) a `members` para poder filtrar el equipo
// mostrado en cada página de proyecto (antes TeamSection mostraba a todos los
// miembros en todas las páginas, sin distinción). Valores usados:
// 'internacionalizacion' | 'vinculacion' | 'desarrollo_habilidades' | 'mentoring'
//
// Cristina Basantes queda en dos proyectos: colídera de Desarrollo de Habilidades
// Lingüísticas (con German) y colaboradora de Internacionalización (Podcast) —
// confirmado explícitamente por el usuario, no un ajuste automático.
//
// También agrega a Verónica Chávez, líder del proyecto Mentoring, que hasta ahora
// no existía en la tabla `members` (solo estaba en profesoresAutorizados/lib/data.ts).
// Sin foto todavía — placeholder hasta que se suba la imagen real a public/images/.

const PROJECTS_BY_MEMBER = {
  member_1: ['internacionalizacion'], // Arturo Rodríguez
  member_2: ['internacionalizacion'], // Jhonny Villafuerte
  member_3: ['desarrollo_habilidades', 'internacionalizacion'], // Cristina Basantes
  member_4: ['internacionalizacion'], // Johana Bello
  member_5: ['internacionalizacion'], // Andy Castillo
  member_6: ['internacionalizacion'], // Josselyn Mera Rivas
  member_7: ['internacionalizacion'], // Doménica Vélez Bravo
  member_8: ['internacionalizacion'], // Ailys Bailón Borja
  member_9: ['internacionalizacion'], // Diana Cedeño Sánchez
  member_10: ['desarrollo_habilidades'], // German Carrera — sale de Internacionalización
  member_11: ['vinculacion'], // Cynthia Zambrano — sale de Internacionalización
};

const VERONICA = {
  id: 'member_12',
  name: 'Mg. Verónica Chávez',
  role: 'Responsable de Comisión Académica y Líder de Proyecto (Mentoring)',
  orcid: '',
  email: 'veronica.chavez@uleam.edu.ec',
  photo: null, // placeholder — pendiente subir foto real
  is_leader: true,
  order: 12,
  projects: ['mentoring'],
};

async function run() {
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS projects TEXT[] NOT NULL DEFAULT '{}'`;

  for (const [id, projects] of Object.entries(PROJECTS_BY_MEMBER)) {
    const res = await sql`UPDATE members SET projects = ${projects}, updated = now() WHERE id = ${id} RETURNING id`;
    if (res.length === 0) console.warn(`Aviso: no se encontró member ${id} para asignarle projects`);
  }

  await sql`
    INSERT INTO members (id, name, role, orcid, email, photo, is_leader, "order", projects, created, updated)
    VALUES (${VERONICA.id}, ${VERONICA.name}, ${VERONICA.role}, ${VERONICA.orcid || null}, ${VERONICA.email}, ${VERONICA.photo}, ${VERONICA.is_leader}, ${VERONICA.order}, ${VERONICA.projects}, now(), now())
    ON CONFLICT (id) DO UPDATE SET projects = EXCLUDED.projects
  `;

  const rows = await sql`SELECT id, name, projects FROM members ORDER BY "order" ASC`;
  console.log('members.projects actualizado:');
  for (const r of rows) console.log(` - ${r.id}: ${r.name} -> [${r.projects.join(', ')}]`);
}
run().catch(e => { console.error(e); process.exit(1); });
