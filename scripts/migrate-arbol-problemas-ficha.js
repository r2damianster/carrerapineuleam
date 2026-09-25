// Árbol de problemas del proyecto de Vinculación (editable) + datos fijos de la ficha.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS parroquia TEXT`;
await sql`
  UPDATE proyectos SET
    vigencia_inicio = DATE '2026-04-01',
    vigencia_fin = DATE '2029-02-28',
    unidad_academica = 'Facultad de Educación y Turismo',
    zona = 'Manta (Distrito 13D02)',
    parroquia = 'Parroquia Manta'
  WHERE id = 'vinculacion'
`;

await sql`
  CREATE TABLE IF NOT EXISTS proyecto_arbol_problemas (
    id SERIAL PRIMARY KEY,
    proyecto_id TEXT NOT NULL DEFAULT 'vinculacion',
    nivel TEXT NOT NULL CHECK (nivel IN ('central','causa_directa','causa_indirecta','efecto_directo','efecto_final')),
    padre_id INTEGER REFERENCES proyecto_arbol_problemas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true
  )
`;

const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM proyecto_arbol_problemas WHERE proyecto_id = 'vinculacion'`;
if (n === 0) {
  const insertar = async (nivel, texto, orden, padreId = null) => {
    const [fila] = await sql`INSERT INTO proyecto_arbol_problemas (proyecto_id, nivel, padre_id, texto, orden) VALUES ('vinculacion', ${nivel}, ${padreId}, ${texto}, ${orden}) RETURNING id`;
    return fila.id;
  };
  await insertar('central', 'Limitado acceso y debilidad en los procesos de enseñanza-aprendizaje del inglés en la comunidad.', 1);
  const c1 = await insertar('causa_directa', 'Bajo nivel de competencias lingüísticas e interculturales.', 1);
  const c2 = await insertar('causa_directa', 'Inexistencia de canales de difusión de prácticas innovadoras.', 2);
  const c3 = await insertar('causa_directa', 'Ausencia de investigación y sistematización pedagógica.', 3);
  await insertar('causa_indirecta', 'Escasa exposición real al idioma en el contexto cotidiano.', 1, c1);
  await insertar('causa_indirecta', 'Falta de recursos didácticos motivadores.', 2, c1);
  await insertar('causa_indirecta', 'Limitados espacios de interacción virtual para el aprendizaje.', 1, c2);
  await insertar('causa_indirecta', 'Escasez de encuentros presenciales y reuniones físicas en la comunidad.', 2, c2);
  await insertar('causa_indirecta', 'Desconocimiento de métodos de sistematización.', 1, c3);
  await insertar('causa_indirecta', 'Baja participación en procesos investigativos.', 2, c3);
  await insertar('efecto_directo', 'Baja competitividad laboral y falta de oportunidades: restricción en el acceso a empleos calificados y desarrollo profesional.', 1);
  await insertar('efecto_directo', 'Aislamiento cultural e informativo: barreras en el acceso a la información global, recursos académicos y redes de intercambio cultural.', 2);
  await insertar('efecto_directo', 'Estancamiento de las prácticas pedagógicas: falta de actualización y renovación metodológica en los procesos de enseñanza.', 3);
  await insertar('efecto_final', 'Exclusión de la comunidad de las dinámicas de la globalización: marginación socioeconómica y cultural de los miembros de la comunidad frente a un entorno global interconectado.', 1);
}
console.log('OK');
