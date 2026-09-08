// La foto del poster session cortaba cabezas con object-cover centrado (el
// contenedor es muy ancho y bajo comparado con la foto original, así que
// solo se ve una franja horizontal delgada de la imagen). Primero se probó
// un enum top/center/bottom, pero "top" mostraba puro cielo — muy poco
// margen. Se cambió a un porcentaje 0-100 (0=borde superior, 100=borde
// inferior) para poder afinar con precisión desde el admin, con vista
// previa en vivo. Aplicado directo en Neon vía MCP; script queda como
// referencia — si se corre contra una tabla que todavía tiene el enum
// viejo, primero hay que dropear el CHECK/tipo TEXT como se hizo acá.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  // Si la columna no existe todavía (instalación nueva), se crea directo
  // como entero. Si ya existe como TEXT enum (top/center/bottom), hay que
  // migrar el tipo primero — ver el bloque comentado abajo.
  await sql`ALTER TABLE fotos ADD COLUMN IF NOT EXISTS posicion INT NOT NULL DEFAULT 50 CHECK (posicion BETWEEN 0 AND 100)`;

  // Bloque real usado para migrar la columna ya existente de TEXT a INT:
  // await sql`ALTER TABLE fotos DROP CONSTRAINT fotos_posicion_check`;
  // await sql`ALTER TABLE fotos ALTER COLUMN posicion DROP DEFAULT`;
  // await sql`ALTER TABLE fotos ALTER COLUMN posicion TYPE INT USING (CASE posicion WHEN 'top' THEN 15 WHEN 'bottom' THEN 85 ELSE 50 END)`;
  // await sql`ALTER TABLE fotos ALTER COLUMN posicion SET DEFAULT 50`;
  // await sql`ALTER TABLE fotos ADD CONSTRAINT fotos_posicion_check CHECK (posicion BETWEEN 0 AND 100)`;

  await sql`UPDATE fotos SET posicion = 30 WHERE id = 'foto_4'`;

  console.log('OK: fotos.posicion como entero 0-100, foto_4 (poster session) ajustada a 30');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
