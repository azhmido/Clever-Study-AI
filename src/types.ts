export type StudyMaterial = {
  id?: string;
  userId: string;
  title: string;
  originalFileName: string;
  summary: {
    title: string;
    keyPoints: string[];
    mainConcepts: { term: string; explanation: string }[];
  };
  flashcards: { front: string; back: string }[];
  quiz: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  chatHistory?: { role: 'user' | 'model'; text: string }[];
  createdAt: number;
};

export type QuizAttempt = {
  id?: string;
  userId: string;
  materialId: string;
  score: number;
  totalQuestions: number;
  createdAt: number;
};
