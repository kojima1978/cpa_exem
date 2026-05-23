import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const subjects = await prisma.subject.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      topics: {
        include: { _count: { select: { questions: true } } },
      },
      sessions: { select: { id: true } },
    },
  });

  // Per-question answer counts
  const [totalCounts, correctCounts] = await Promise.all([
    prisma.answerHistory.groupBy({
      by: ["questionId"],
      _count: true,
    }),
    prisma.answerHistory.groupBy({
      by: ["questionId"],
      where: { isCorrect: true },
      _count: true,
    }),
  ]);

  // Map questionId → { total, correct }
  const answerMap = new Map<number, { total: number; correct: number }>();
  for (const a of totalCounts) {
    answerMap.set(a.questionId, { total: a._count, correct: 0 });
  }
  for (const a of correctCounts) {
    const entry = answerMap.get(a.questionId);
    if (entry) entry.correct = a._count;
  }

  // Map topicId → questionIds
  const topicQuestions = await prisma.question.findMany({
    select: { id: true, topicId: true },
  });
  const topicQuestionMap = new Map<number, number[]>();
  for (const q of topicQuestions) {
    const arr = topicQuestionMap.get(q.topicId) || [];
    arr.push(q.id);
    topicQuestionMap.set(q.topicId, arr);
  }

  const stats = subjects.map((subject) => {
    let questionCount = 0;
    let totalAnswered = 0;
    let totalCorrect = 0;
    let answeredQuestions = 0;

    for (const topic of subject.topics) {
      questionCount += topic._count.questions;
      const qIds = topicQuestionMap.get(topic.id) || [];
      for (const qId of qIds) {
        const a = answerMap.get(qId);
        if (a) {
          totalAnswered += a.total;
          totalCorrect += a.correct;
          answeredQuestions++;
        }
      }
    }

    return {
      id: subject.id,
      name: subject.name,
      questionCount,
      topicCount: subject.topics.length,
      sessionCount: subject.sessions.length,
      answeredQuestions,
      totalAnswered,
      totalCorrect,
      accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null,
    };
  });

  return NextResponse.json(stats);
}
