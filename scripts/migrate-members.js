import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Migración piloto: members estático (lib/data.ts) -> tabla real en Neon.
// Preserva los ids originales (member_1, member_2...) como PK TEXT — hay
// referencias por id en el resto del sitio (ver plan de migración).

const MEMBERS = [
  { id: 'member_1', name: 'Dr. Arturo Rodríguez', role: 'Líder de Internacionalización y Miembro de Vinculación', orcid: '0000-0002-7017-9443', email: 'arturo.rodriguez@uleam.edu.ec', photo: '/images/members/lider_arturo_rodriguez.jpg', is_leader: true, order: 1, created: '2025-01-01T00:00:00Z' },
  { id: 'member_2', name: 'Dr. Jhonny Villafuerte', role: 'Colíder del Proyecto', orcid: '0000-0001-6053-6307', email: 'jhonny.villafuerte@uleam.edu.ec', photo: '/images/members/colider_Jhonny_Villafuerte.jpg', is_leader: false, order: 2, created: '2025-01-01T00:00:00Z' },
  { id: 'member_3', name: 'Mg. Cristina Basantes Robalino', role: 'Miembro de Investigación y Colaboradora de Internacionalización (Podcast)', orcid: '0000-0001-5184-9643', email: '', photo: '/images/members/Cristina_CoordinadorPODCAST.jpeg', is_leader: false, order: 3, created: '2025-01-01T00:00:00Z' },
  { id: 'member_4', name: 'Psi. Johana Bello, Mg.', role: 'Colaboradora en Investigación y Directora de Psicología Educativa', orcid: '0000-0002-0882-1060', email: '', photo: '/images/members/JohanaBello.jpeg', is_leader: false, order: 4, created: '2025-01-01T00:00:00Z' },
  { id: 'member_5', name: 'Andy Castillo', role: 'Estudiante Investigador', orcid: '0009-0009-8630-7444', email: '', photo: '/images/members/ANdyCastilo.png', is_leader: false, order: 5, created: '2026-04-26T00:00:00Z' },
  { id: 'member_6', name: 'Josselyn Mera Rivas', role: 'Estudiante Investigadora / Equipo de Podcast', orcid: '', email: '', photo: '/images/members/Josselyn_Mera.jpg', is_leader: false, order: 6, created: '2026-05-20T00:00:00Z' },
  { id: 'member_7', name: 'Doménica Valeska Vélez Bravo', role: 'Equipo de Podcast', orcid: '0009-0009-3023-0564', email: '', photo: '/images/members/Domenica_Velez.jpeg', is_leader: false, order: 8, created: '2026-05-27T00:00:00Z' },
  { id: 'member_8', name: 'Ailys Jordana Bailón Borja', role: 'Estudiante Investigadora / Equipo de Podcast', orcid: '', email: '', photo: '/images/members/Ailys_Bailon.jpeg', is_leader: false, order: 7, created: '2026-05-27T00:00:00Z' },
  { id: 'member_10', name: 'Dr. German Carrera Moreno, PhD.', role: 'Líder de Proyecto (Desarrollo de Habilidades Lingüísticas)', orcid: '0000-0002-4974-5615', email: 'german.carrera@uleam.edu.ec', photo: '', is_leader: true, order: 10, created: '2026-08-30T00:00:00Z' },
  { id: 'member_11', name: 'Mg. Cynthia Zambrano Zambrano', role: 'Líder de Proyecto (Vinculación)', orcid: '0000-0002-0129-9134', email: '', photo: '', is_leader: true, order: 11, created: '2026-08-30T00:00:00Z' },
  { id: 'member_9', name: 'Diana Noemi Cedeño Sánchez', role: 'Estudiante Investigadora / Equipo de Podcast', orcid: '', email: '', photo: '/images/members/DianaNoemCedenoSanchez.jpeg', is_leader: false, order: 9, created: '2026-07-21T00:00:00Z' },
];

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, orcid TEXT,
      email TEXT NOT NULL DEFAULT '', photo TEXT, is_leader BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      created TIMESTAMPTZ NOT NULL DEFAULT now(), updated TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  for (const m of MEMBERS) {
    await sql`
      INSERT INTO members (id, name, role, orcid, email, photo, is_leader, "order", created, updated)
      VALUES (${m.id}, ${m.name}, ${m.role}, ${m.orcid || null}, ${m.email}, ${m.photo || null}, ${m.is_leader}, ${m.order}, ${m.created}, ${m.created})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  const count = await sql`SELECT count(*) FROM members`;
  console.log('members: tabla lista,', count[0].count, 'filas');
}
run().catch(e => { console.error(e); process.exit(1); });
