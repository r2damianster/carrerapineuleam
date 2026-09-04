import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// "Mi Perfil" (/portal/perfil) — un profesor puede tener más de un título de tercer
// y/o cuarto nivel; esta tabla reemplaza el supuesto de "un solo grado/posgrado" que
// tenían usuarios.titulo_grado/post_grado y members.grado/posgrado (ambos siguen
// existiendo, pero pasan a ser DERIVADOS: reflejan el título marcado es_principal de
// cada nivel, ver app/api/perfil/titulos/route.ts). `tipo` reusa el mismo catálogo
// fijo que ya usaba app/admin/members/page.tsx (ahora en lib/gradosCatalogo.ts).

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS perfiles_titulos_academicos (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nivel VARCHAR(15) NOT NULL CHECK (nivel IN ('tercer_nivel', 'cuarto_nivel')),
      tipo VARCHAR(30) NOT NULL,
      titulo_especifico TEXT,
      institucion TEXT,
      anio INTEGER,
      es_principal BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('Migración completada: tabla perfiles_titulos_academicos');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
