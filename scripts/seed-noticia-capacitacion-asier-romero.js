import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Noticia pública: capacitación internacional Dr. Asier Romero Andonegi (UPV/EHU)
// en actividades_difusion (origen='noticia'), nace ya aprobada porque la crea
// directamente contenido_sitio (Arturo). Ver CLAUDE.md Sesión 26.

async function main() {
  const [existente] = await sql`
    SELECT id FROM actividades_difusion WHERE slug = 'capacitacion-internacional-asier-romero-agosto-2026'
  `;
  if (existente) {
    console.log('Ya existe, id:', existente.id);
    return;
  }

  const [arturo] = await sql`
    SELECT id FROM usuarios WHERE email = 'arturo.rodriguez@uleam.edu.ec'
  `;
  if (!arturo) throw new Error('No se encontró usuario arturo.rodriguez@uleam.edu.ec en Neon');

  const [nueva] = await sql`
    INSERT INTO actividades_difusion
      (origen, titulo, descripcion, fecha, photos, slug, is_featured, "order", aprobado_sitio, aprobado_por, fecha_aprobacion, profesores_responsables)
    VALUES (
      'noticia',
      'Capacitación internacional con el Dr. Asier Romero Andonegi (UPV/EHU): pensamiento crítico, IA y mentoría docente',
      'Entre el 4 y el 13 de agosto de 2026 se realizó en Manta una capacitación internacional de actualización de conocimientos dictada por el Dr. Asier Romero Andonegi, de la Universidad del País Vasco (UPV/EHU), con una duración de 40 horas académicas. Los contenidos abordados fueron: pensamiento crítico y uso pedagógico de la inteligencia artificial en la Educación Superior, análisis del discurso en español, y mentoría para el desarrollo profesional docente. La Facultad de Educación y Turismo de la ULEAM certificó a 14 docentes, y la Red de Investigación Científica sobre Comprensión Lectora y Escritura Académica y Creativa (RED-LEA) certificó adicionalmente a 4 doctorandos del programa de doctorado en la UPV/EHU, entre ellos Arturo Rodríguez Zambrano, líder de este proyecto. La actividad se enmarca en la colaboración internacional del proyecto con la Universidad del País Vasco.',
      '2026-08-13',
      ARRAY[
        '/images/2026-08-13_Capacitacion-AsierRomero-Auditorio.jpeg',
        '/images/2026-08-13_Capacitacion-AsierRomero-JornadaLiteratura.jpeg',
        '/images/2026-08-13_Capacitacion-AsierRomero-RolesEducativos.jpeg'
      ],
      'capacitacion-internacional-asier-romero-agosto-2026',
      true,
      0,
      true,
      ${arturo.id},
      now(),
      '{}'
    )
    RETURNING id, titulo, slug
  `;
  console.log('Insertada:', nueva);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
