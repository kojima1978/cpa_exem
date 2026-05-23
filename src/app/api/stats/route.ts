import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateStreak, calculateLongestStreak } from "@/lib/streak";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const [totalQuestions, todayStreak, allStreaks] =
    await Promise.all([
      prisma.question.count(),
      prisma.studyStreak.findUnique({ where: { date: today } }),
      prisma.studyStreak.findMany({ orderBy: { date: "desc" } }),
    ]);

  const totalAnswered = await prisma.answerHistory.count();
  const totalCorrect = await prisma.answerHistory.count({
    where: { isCorrect: true },
  });

  const currentStreak = calculateStreak(allStreaks.map((s) => s.date));

  const subjectCounts = await prisma.question.groupBy({
    by: ["topicId"],
    _count: { id: true },
  });

  const topics = await prisma.topic.findMany({
    include: { subject: { select: { name: true } } },
  });

  const subjectQuestionCounts = new Map<string, number>();
  for (const tc of subjectCounts) {
    const topic = topics.find((t) => t.id === tc.topicId);
    if (!topic) continue;
    const name = topic.subject.name;
    subjectQuestionCounts.set(
      name,
      (subjectQuestionCounts.get(name) || 0) + tc._count.id
    );
  }

  return NextResponse.json({
    totalQuestions,
    totalAnswered,
    totalCorrect,
    overallAccuracy:
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    today: {
      questionCount: todayStreak?.questionCount ?? 0,
      correctCount: todayStreak?.correctCount ?? 0,
      accuracy:
        todayStreak && todayStreak.questionCount > 0
          ? Math.round(
              (todayStreak.correctCount / todayStreak.questionCount) * 100
            )
          : 0,
    },
    streak: {
      current: currentStreak,
      longest: calculateLongestStreak(allStreaks.map((s) => s.date)),
    },
    subjectQuestionCounts: Object.fromEntries(subjectQuestionCounts),
  });
}
