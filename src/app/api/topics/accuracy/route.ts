import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Get all answer counts grouped by questionId
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

  // Build per-question stats
  const correctMap = new Map(correctCounts.map((c) => [c.questionId, c._count]));
  const questionStats = totalCounts.map((t) => ({
    questionId: t.questionId,
    total: t._count,
    correct: correctMap.get(t.questionId) ?? 0,
  }));

  // Get question→topic mapping
  const questionIds = questionStats.map((q) => q.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, topicId: true },
  });
  const questionTopicMap = new Map(questions.map((q) => [q.id, q.topicId]));

  // Aggregate by topic
  const topicAgg = new Map<number, { total: number; correct: number }>();
  for (const qs of questionStats) {
    const topicId = questionTopicMap.get(qs.questionId);
    if (topicId == null) continue;
    const agg = topicAgg.get(topicId) || { total: 0, correct: 0 };
    agg.total += qs.total;
    agg.correct += qs.correct;
    topicAgg.set(topicId, agg);
  }

  // Filter topics with >= 5 total answers
  const topicIds = Array.from(topicAgg.entries())
    .filter(([, agg]) => agg.total >= 5)
    .map(([id]) => id);

  // Fetch topic details with subject
  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds } },
    include: { subject: { select: { name: true } } },
    orderBy: { displayOrder: "asc" },
  });

  const result = topics.map((t) => {
    const agg = topicAgg.get(t.id)!;
    return {
      topicId: t.id,
      topicName: t.name,
      subjectName: t.subject.name,
      total: agg.total,
      correct: agg.correct,
      accuracy: Math.round((agg.correct / agg.total) * 100),
    };
  });

  // Sort by accuracy ascending (weakest first)
  result.sort((a, b) => a.accuracy - b.accuracy);

  return NextResponse.json(result);
}
