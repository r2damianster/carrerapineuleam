export type Question = {
  id: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  text: string;
  options: { a: string; b: string; c: string; d: string };
  correct: 'a' | 'b' | 'c' | 'd';
};

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
  }
];
