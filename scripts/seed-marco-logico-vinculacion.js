// Carga la matriz de marco lógico del proyecto de Vinculación (editable después en /vinculacion/proyecto).
// Idempotente: no hace nada si proyecto_objetivos ya tiene filas de 'vinculacion'.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const objetivos = [
  { clave: 'FIN', tipo: 'general', texto: 'FIN: Inclusión de la comunidad en redes globales y mejora de su perfil competitivo internacional. Meta: incremento de oportunidades laborales en 50% de los participantes, en función de la adquisición del idioma, en un plazo de 6 años.' },
  { clave: 'PROPOSITO', tipo: 'general', texto: 'PROPÓSITO: Mejora del acceso y dominio del inglés mediante la implementación de estrategias pedagógicas. Meta: 100 participantes de los programas de inglés mejoran su nivel de suficiencia en 1 subnivel del MCER en un periodo de 2 años.' },
  { clave: 'C1', tipo: 'especifico', texto: 'COMPONENTE 1 (Enseñanza): Fortalecimiento de competencias lingüísticas e interculturales mediante currículos actualizados. Meta: 25 beneficiarios aprueban las evaluaciones de competencias con una nota promedio mínima de 4.0/5.0 al finalizar cada ciclo de 6 meses.' },
  { clave: 'C2', tipo: 'especifico', texto: 'COMPONENTE 2 (Difusión): Canales de divulgación virtual y presencial establecidos y con alta interacción comunitaria. Metas: 50 beneficiarios participan semestralmente en actividades virtuales de difusión; 1 encuentro físico semestral.' },
  { clave: 'C3', tipo: 'especifico', texto: 'COMPONENTE 3 (Investigación): Procesos de investigación y sistematización de prácticas pedagógicas operando activamente. Metas: 1 documento de sistematización terminado con estándares de calidad para publicación anual; 6 estudiantes universitarios vinculados a procesos investigativos con entregables técnicos validados en 2 años.' },
];

const actividades = [
  { comp: 'C1', actividad: '1.1 Ejecución de programa de inglés en entornos accesibles para la exposición real al idioma. Meta: programas de enseñanza de inglés en al menos 3 espacios semestrales.' },
  { comp: 'C1', actividad: '1.2 Diseño de recursos didácticos motivadores. Meta: satisfacción de 70% en la encuesta de calidad por parte de los beneficiarios.' },
  { comp: 'C2', actividad: '2.1 Transferencia a través de programas en espacios de difusión e interacción virtual. Meta: 6 programas virtuales anuales en temas educativos relacionados con la enseñanza lingüística y prácticas pedagógicas.' },
  { comp: 'C2', actividad: '2.2 Transferencia a través de la organización de reuniones físicas comunitarias. Meta: 1 espacio de socialización cultural-lingüística comunitaria semestral.' },
  { comp: 'C3', actividad: '3.1 Capacitación en métodos de sistematización. Meta: 2 eventos anuales de formación y difusión de resultados de vinculación e investigación.' },
  { comp: 'C3', actividad: '3.2 Fomento de la participación en procesos investigativos. Meta: 6 estudiantes universitarios vinculados a procesos investigativos con entregables técnicos validados en 3 años.' },
];

const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM proyecto_objetivos WHERE proyecto_id = 'vinculacion'`;
if (n > 0) { console.log('Ya hay objetivos, no se hace nada.'); process.exit(0); }
const [ciclo] = await sql`SELECT id FROM ciclos_academicos ORDER BY fecha_inicio DESC LIMIT 1`;
const ids = {};
for (const [indiceObjetivo, objetivo] of objetivos.entries()) {
  const [fila] = await sql`INSERT INTO proyecto_objetivos (proyecto_id, tipo, texto, orden, activo) VALUES ('vinculacion', ${objetivo.tipo}, ${objetivo.texto}, ${indiceObjetivo + 1}, true) RETURNING id`;
  ids[objetivo.clave] = fila.id;
}
for (const actividad of actividades) {
  await sql`INSERT INTO proyecto_actividades_plan (objetivo_id, actividad, ciclo_id, activo) VALUES (${ids[actividad.comp]}, ${actividad.actividad}, ${ciclo.id}, true)`;
}
console.log('OK objetivos', objetivos.length, 'actividades', actividades.length, 'ciclo', ciclo.id);
