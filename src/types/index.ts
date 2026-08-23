export type QuestionWithRelations = {
  id: number;
  topicId: number;
  sessionId: number | null;
  materialId: number | null;
  text: string;
  difficulty: number;
  briefExplanation: string;
  detailedExplanation: string;
  sourceReference: string;
  sourcePage: number | null;
  year: number | null;
  createdAt: string;
  topic: { id: number; name: string };
  session: { id: number; name: string } | null;
  material: MaterialData | null;
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

export type MaterialData = {
  id: number;
  title: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  fileExists?: boolean;
  _count?: { questions: number };
};

export type ImportQuestion = {
  subject?: string;
  topic: string;
  session?: string;
  text: string;
  difficulty?: number;
  briefExplanation?: string;
  detailedExplanation?: string;
  sourceReference?: string;
  sourcePdf?: string;
  sourcePage?: number;
  year?: number;
  choices: { text: string; isCorrect: boolean }[];
};
