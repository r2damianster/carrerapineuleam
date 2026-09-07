const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Horario de tutorías, autoeditado por cada profesor en /portal/perfil
// (mismo patrón 1-a-muchos que perfiles_titulos_academicos) y publicado sin
// aprobación en /docencia/docencia-innovadora — filtrado por
// usuarios.dependencia = DEPENDENCIA_PINE (misma constante que
// app/utilidades/_lib/docentes.ts). A diferencia de foto/ORCID (tarjeta de
// equipo curada), esto es información operativa: se publica de inmediato.
//
// Aplicado en producción vía Neon MCP. Este script queda como referencia.

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS perfiles_horario_tutorias (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      dia_semana TEXT NOT NULL CHECK (dia_semana IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    )
  `;
  console.log('Tabla perfiles_horario_tutorias creada (o ya existía).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
