export type QuestionWithRelations = {
  id: number;
  topicId: number;
  sessionId: number | null;
  text: string;
  difficulty: number;
  briefExplanation: string;
  detailedExplanation: string;
  year: number | null;
  createdAt: string;
  topic: { id: number; name: string };
  session: { id: number; name: string } | null;
  choices: ChoiceData[];
};

export type ChoiceData = {
  id: number;
  text: string;
  isCorrect: boolean;
  displayOrder: number;
};

export type TopicData = {
  id: number;
  subjectId: number;
  name: string;
  displayOrder: number;
  _count?: { questions: number };
};

export type SessionData = {
  id: number;
  subjectId: number;
  name: string;
  description: string;
  displayOrder: number;
  _count?: { questions: number };
};

export type SubjectData = {
  id: number;
  name: string;
  displayOrder: number;
};

export type ImportQuestion = {
  topic: string;
  session?: string;
  text: string;
  difficulty?: number;
  briefExplanation?: string;
  detailedExplanation?: string;
  year?: number;
  choices: { text: string; isCorrect: boolean }[];
};
