// Vincula una contribución con filas reales de Neon al guardarla:
//  - proyectoId: de qué proyecto (proyectos.id) es, a partir del nombre oficial del dropdown.
//  - usuarioId por autor: qué docente (usuarios.id) es cada autor de la carrera.
// Ambos alimentan lib/permisosContribucion.ts, que antes dependía de comparar texto.
// Sin imports de Node/Neon a nivel de módulo — recibe `sql` desde el handler.

// Nombre oficial (valor del dropdown "Proyecto" del wizard) → proyectos.id.
const PROYECTO_ID_POR_NOMBRE_OFICIAL: Record<string, string> = {
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.':
    'internacionalizacion',
  'Desarrollo de las habilidades lingüísticas del idioma inglés en estudiantes de educación superior en Ecuador.':
    'desarrollo_habilidades',
  'Dinámicas Lingüísticas en Contextos Locales': 'vinculacion',
  'Desarrollo Humano y perfil profesional en la formación de docentes: Mentoría y Aprendizaje Socioemocional':
    'mentoring',
};

export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function resolverProyectoId(nombreProyecto: string | null | undefined): string | null {
  if (!nombreProyecto) return null;
  return PROYECTO_ID_POR_NOMBRE_OFICIAL[nombreProyecto.trim()] ?? null;
}

interface AutorParaVincular {
  authorName: string;
  isCarreraAuthor: boolean;
  esEstudiante?: boolean;
}

interface DocenteDirectorio {
  id: number;
  tokens: string[];
}

// Un autor coincide con un docente cuando todas las palabras de su nombre aparecen en el
// nombre completo del docente (tolera "Jhonny Villafuerte Holguín" vs "Jhonny Saulo Villafuerte
// Holguín"). Si hay 0 o más de 1 coincidencia no se asigna usuarioId (queda NULL) — nunca se adivina.
function buscarDocente(authorName: string, docentes: DocenteDirectorio[]): number | null {
  const tokensAutor = normalizarTexto(authorName).split(' ').filter(Boolean);
  if (tokensAutor.length < 2) return null;
  const coincidencias = docentes.filter(docente =>
    tokensAutor.every(token => docente.tokens.includes(token))
  );
  return coincidencias.length === 1 ? coincidencias[0].id : null;
}

// Devuelve, en el mismo orden que `autores`, el usuarioId de cada uno (o null).
export async function resolverUsuarioIdsAutores(
  sql: any,
  autores: AutorParaVincular[]
): Promise<(number | null)[]> {
  const hayAutorDeCarrera = autores.some(autor => autor.isCarreraAuthor && !autor.esEstudiante);
  if (!hayAutorDeCarrera) return autores.map(() => null);

  const filas = await sql`
    SELECT id, nombres, apellidos
    FROM usuarios
    WHERE rol IN ('profesor', 'admin')
  `;
  const docentes: DocenteDirectorio[] = filas.map((fila: any) => ({
    id: Number(fila.id),
    tokens: normalizarTexto(`${fila.nombres} ${fila.apellidos}`).split(' ').filter(Boolean),
  }));

  return autores.map(autor =>
    autor.isCarreraAuthor && !autor.esEstudiante ? buscarDocente(autor.authorName, docentes) : null
  );
}
