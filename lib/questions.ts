export type Question = {
  id: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  /** 'multiple_choice' (default) | 'reading' (lleva passage) | 'audio' (sin options/correct, autoevaluada con IA) */
  type?: 'multiple_choice' | 'reading' | 'audio';
  text: string;
  /** Solo 'reading': texto corto que se muestra antes de la pregunta */
  passage?: string;
  options?: { a: string; b: string; c: string; d: string };
  correct?: 'a' | 'b' | 'c' | 'd';
  /** Solo 'audio': segundos máximos de grabación permitidos */
  audioMaxSeconds?: number;
};

/** Preguntas con radio button (todas menos la de audio) — usado para exigir que estén todas respondidas antes de enviar. */
export const preguntasCalificables = () => mcerQuestions.filter(q => q.type !== 'audio');

export type HabilidadMcer = 'grammar' | 'reading' | 'speaking';

export function habilidadDePregunta(q: Question): HabilidadMcer {
  if (q.type === 'reading') return 'reading';
  if (q.type === 'audio') return 'speaking';
  return 'grammar';
}

export type ResultadoMcer = {
  /** Promedio final 0-100 entre las habilidades presentes en el banco (gramática/lectura/oral) */
  score: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  desglose: { grammar: number | null; reading: number | null; speaking: number | null };
};

/**
 * Puntaje final MCER = promedio simple de 3 componentes (gramática, lectura, oral),
 * cada uno normalizado a 0-100 — no un conteo crudo de aciertos. La pregunta de audio
 * cuenta con el mismo peso que el bloque de gramática/lectura, no es solo diagnóstico.
 */
export function calcularResultadoMcer(answers: Record<number, string>, speakingScore: number | null): ResultadoMcer {
  const porcentajeCorrectas = (qs: Question[]): number | null => {
    if (qs.length === 0) return null;
    const correctas = qs.filter(q => answers[q.id] === q.correct).length;
    return (correctas / qs.length) * 100;
  };

  const grammar = porcentajeCorrectas(mcerQuestions.filter(q => habilidadDePregunta(q) === 'grammar'));
  const reading = porcentajeCorrectas(mcerQuestions.filter(q => habilidadDePregunta(q) === 'reading'));
  const hayPreguntaOral = mcerQuestions.some(q => habilidadDePregunta(q) === 'speaking');
  const speaking = hayPreguntaOral ? speakingScore : null;

  const componentes = [grammar, reading, speaking].filter((v): v is number => v !== null);
  const score = componentes.length > 0 ? Math.round(componentes.reduce((a, b) => a + b, 0) / componentes.length) : 0;

  const pct = score / 100;
  let level: Question['level'];
  if (pct <= 0.25) level = 'A1';
  else if (pct <= 0.5) level = 'A2';
  else if (pct <= 0.75) level = 'B1';
  else level = 'B2';

  return { score, level, desglose: { grammar, reading, speaking } };
}

export const mcerQuestions: Question[] = [
  // Nivel A1 (1-5)
  {
    id: 1,
    level: 'A1',
    text: "Hello, what ______ your name?",
    options: { a: "are", b: "is", c: "am", d: "be" },
    correct: 'b'
  },
  {
    id: 2,
    level: 'A1',
    text: "I ______ from Ecuador.",
    options: { a: "are", b: "am", c: "is", d: "be" },
    correct: 'b'
  },
  {
    id: 3,
    level: 'A1',
    text: "______ you like coffee?",
    options: { a: "Do", b: "Does", c: "Are", d: "Is" },
    correct: 'a'
  },
  {
    id: 4,
    level: 'A1',
    text: "She ______ a car.",
    options: { a: "have", b: "haves", c: "has", d: "having" },
    correct: 'c'
  },
  {
    id: 5,
    level: 'A1',
    text: "They ______ playing football.",
    options: { a: "am", b: "is", c: "are", d: "do" },
    correct: 'c'
  },
  // Nivel A2 (6-10)
  {
    id: 6,
    level: 'A2',
    text: "I ______ to the cinema yesterday.",
    options: { a: "go", b: "gone", c: "went", d: "going" },
    correct: 'c'
  },
  {
    id: 7,
    level: 'A2',
    text: "She is ______ than her brother.",
    options: { a: "tall", b: "taller", c: "tallest", d: "more tall" },
    correct: 'b'
  },
  {
    id: 8,
    level: 'A2',
    text: "We ______ TV when the phone rang.",
    options: { a: "watched", b: "are watching", c: "were watching", d: "watch" },
    correct: 'c'
  },
  {
    id: 9,
    level: 'A2',
    text: "Have you ever ______ to London?",
    options: { a: "be", b: "was", c: "went", d: "been" },
    correct: 'd'
  },
  {
    id: 10,
    level: 'A2',
    text: "If it rains, we ______ at home.",
    options: { a: "stay", b: "stayed", c: "will stay", d: "staying" },
    correct: 'c'
  },
  // Nivel B1 (11-15)
  {
    id: 11,
    level: 'B1',
    text: "The book ______ by a famous author in 1999.",
    options: { a: "wrote", b: "was written", c: "is written", d: "writes" },
    correct: 'b'
  },
  {
    id: 12,
    level: 'B1',
    text: "I'm looking forward ______ you next week.",
    options: { a: "to see", b: "seeing", c: "to seeing", d: "see" },
    correct: 'c'
  },
  {
    id: 13,
    level: 'B1',
    text: "By the time we arrived, the movie ______.",
    options: { a: "started", b: "has started", c: "starts", d: "had started" },
    correct: 'd'
  },
  {
    id: 14,
    level: 'B1',
    text: "She asked me where ______.",
    options: { a: "I lived", b: "did I live", c: "do I live", d: "I live" },
    correct: 'a'
  },
  {
    id: 15,
    level: 'B1',
    text: "I wish I ______ more time to study.",
    options: { a: "have", b: "had", c: "has", d: "having" },
    correct: 'b'
  },
  // Nivel B2 (16-20)
  {
    id: 16,
    level: 'B2',
    text: "Despite ______ tired, he finished the project.",
    options: { a: "he was", b: "being", c: "to be", d: "of being" },
    correct: 'b'
  },
  {
    id: 17,
    level: 'B2',
    text: "You ______ have seen him yesterday, he is in Paris!",
    options: { a: "mustn't", b: "shouldn't", c: "can't", d: "wouldn't" },
    correct: 'c'
  },
  {
    id: 18,
    level: 'B2',
    text: "Rarely ______ such a brilliant performance.",
    options: { a: "I have seen", b: "have I seen", c: "I saw", d: "did I saw" },
    correct: 'b'
  },
  {
    id: 19,
    level: 'B2',
    text: "He'll get used ______ early eventually.",
    options: { a: "to waking up", b: "to wake up", c: "waking up", d: "wake up" },
    correct: 'a'
  },
  {
    id: 20,
    level: 'B2',
    text: "If I had known you were coming, I ______ a cake.",
    options: { a: "will bake", b: "would bake", c: "would have baked", d: "baked" },
    correct: 'c'
  },
  // Nivel B1 — superlativo (21)
  {
    id: 21,
    level: 'B1',
    text: "Mt. Everest is ______ mountain in the world.",
    options: { a: "the high", b: "high as", c: "higher than", d: "the highest" },
    correct: 'd'
  },
  // Nivel B2 — segundo condicional (22)
  {
    id: 22,
    level: 'B2',
    text: "If I went to live in a foreign country, ______ my friends.",
    options: { a: "I'd miss", b: "I'm missing", c: "I missed", d: "I miss" },
    correct: 'a'
  },
  // Nivel B1 — tag question (23)
  {
    id: 23,
    level: 'B1',
    text: "You have been to Spain, ______?",
    options: { a: "have you", b: "you have", c: "haven't you", d: "don't you" },
    correct: 'c'
  },
  // Nivel B2 — lectura inferencial (24)
  {
    id: 24,
    level: 'B2',
    type: 'reading',
    passage: "Marco arrived at the office an hour early. He made coffee, organized his desk, and reviewed his notes twice before anyone else arrived.",
    text: "What can we infer about Marco?",
    options: {
      a: "He dislikes his job",
      b: "He is very disorganized",
      c: "He is well-prepared and responsible",
      d: "He was late for work"
    },
    correct: 'c'
  },
  // Diagnóstico oral — no suma al puntaje MCER, se autoevalúa aparte con IA (25)
  {
    id: 25,
    level: 'B1',
    type: 'audio',
    text: "Graba un audio corto (máx. 30 segundos) describiendo tu rutina diaria en inglés.",
    audioMaxSeconds: 30
  }
];
