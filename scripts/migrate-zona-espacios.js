// Zona (Cantón/Parroquia/Barrio/Ubicación) por espacio de Vinculación — Sesión 57.
// El informe MENSUAL (líder y supervisor, distinto del semestral) pide esta dirección
// por cada espacio (club/fundación/unidad educativa), algo que antes solo existía a
// nivel de proyecto completo (proyectos.zona/parroquia). Sembrado solo donde hay
// evidencia real (confirmación del usuario o los propios documentos .docx que subió
// como plantilla) — el resto de espacios (Submarino Amarillo, Cross Worlds, UE Manuela
// Cañizares) queda NULL a propósito, se completa en /vinculacion/espacios.
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`ALTER TABLE "espacios_enseñanza" ADD COLUMN IF NOT EXISTS zona_canton TEXT`;
  await sql`ALTER TABLE "espacios_enseñanza" ADD COLUMN IF NOT EXISTS zona_parroquia TEXT`;
  await sql`ALTER TABLE "espacios_enseñanza" ADD COLUMN IF NOT EXISTS zona_barrio TEXT`;
  await sql`ALTER TABLE "espacios_enseñanza" ADD COLUMN IF NOT EXISTS zona_ubicacion TEXT`;

  // Speaking Clubs internos + Podcast (entidad_id=1, ULEAM-FEDU) — confirmado por el usuario.
  await sql`
    UPDATE "espacios_enseñanza"
    SET zona_canton = 'Manta', zona_parroquia = 'Urbanas', zona_barrio = 'Ciudadela Universitaria', zona_ubicacion = 'Vía San Mateo, Manta'
    WHERE id IN (9, 10, 14, 15, 16)
  `;

  // Básica/Inicial Bilingüe — según "2JULIO MYG INFORME-MENSUAL-SUPERVISOR".
  await sql`
    UPDATE "espacios_enseñanza"
    SET zona_canton = 'Manta', zona_parroquia = 'Urbanas', zona_barrio = 'Avenida Circunvalación', zona_ubicacion = 'Avenida Circunvalación, Manta'
    WHERE id IN (11, 12)
  `;

  // Juan Montalvo (ambos grupos) — según "2JULIO MYG INFORME-MENSUAL-SUPERVISOR".
  await sql`
    UPDATE "espacios_enseñanza"
    SET zona_canton = 'Manta', zona_parroquia = 'Urbanas', zona_barrio = 'Calle 12 y Av. Ascario Paz', zona_ubicacion = 'Calle 12 y Av. Ascario Paz, Manta'
    WHERE id IN (7, 17)
  `;

  console.log('Migración completada: zona_canton/zona_parroquia/zona_barrio/zona_ubicacion en espacios_enseñanza.');
}

main();
