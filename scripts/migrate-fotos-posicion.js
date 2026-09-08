// La foto del poster session cortaba cabezas con object-cover centrado
// (las personas quedan cerca del borde superior de la foto original).
// Columna nueva para que el admin controle el recorte por foto sin tocar
// código — igual filosofía que el resto del Banco de Fotos (Sesión 32).
// Aplicado directo en Neon vía MCP; script queda como referencia.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    ALTER TABLE fotos ADD COLUMN IF NOT EXISTS posicion TEXT NOT NULL DEFAULT 'center'
      CHECK (posicion IN ('top', 'center', 'bottom'))
  `;

  await sql`UPDATE fotos SET posicion = 'top' WHERE id = 'foto_4'`;

  console.log('OK: fotos.posicion agregada, foto_4 (poster session) ajustada a top');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
