import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const subjectId = sp.get("subjectId");
  const topicId = sp.get("topicId");
  const difficulty = sp.get("difficulty");

  // Build base where clause
  const base: Record<string, unknown> = {};
  if (subjectId && !topicId) {
    base.topic = { subjectId: Number(subjectId) };
  }
  if (topicId) base.topicId = Number(topicId);
  if (difficulty) base.difficulty = Number(difficulty);

  // all
  const all = await prisma.question.count({ where: base });

  // unanswered
  const unanswered = await prisma.question.count({
    where: { ...base, answerHistories: { none: {} } },
  });

  // bookmarked
  const bookmarked = await prisma.question.count({
    where: { ...base, bookmarks: { some: {} } },
  });

  // wrong (last answer is incorrect)
  let wrong = 0;
  {
    const allAnswered = await prisma.answerHistory.findMany({
      select: { questionId: true, isCorrect: true },
      orderBy: { answeredAt: "desc" },
    });
    const lastAnswerMap = new Map<number, boolean>();
    for (const a of allAnswered) {
      if (!lastAnswerMap.has(a.questionId)) {
        lastAnswerMap.set(a.questionId, a.isCorrect);
      }
    }
    const wrongIds = Array.from(lastAnswerMap.entries())
      .filter(([, correct]) => !correct)
      .map(([id]) => id);
    if (wrongIds.length > 0) {
      wrong = await prisma.question.count({
        where: { ...base, id: { in: wrongIds } },
      });
    }
  }

  // weak (accuracy <= 50%, min 2 answers)
  let weak = 0;
  {
    const [totalCounts, correctCounts] = await Promise.all([
      prisma.answerHistory.groupBy({ by: ["questionId"], _count: true }),
      prisma.answerHistory.groupBy({
        by: ["questionId"],
        where: { isCorrect: true },
        _count: true,
      }),
    ]);
    const correctMap = new Map(correctCounts.map((c) => [c.questionId, c._count]));
    const weakIds = totalCounts
      .filter((t) => {
        if (t._count < 2) return false;
        const correct = correctMap.get(t.questionId) ?? 0;
        return Math.round((correct / t._count) * 100) <= 50;
      })
      .map((t) => t.questionId);
    if (weakIds.length > 0) {
      weak = await prisma.question.count({
        where: { ...base, id: { in: weakIds } },
      });
    }
  }

  // review (nextReviewAt <= now)
  const review = await prisma.question.count({
    where: { ...base, nextReviewAt: { lte: new Date() } },
  });

  return NextResponse.json({
    all,
    unanswered,
    bookmarked,
    wrong,
    weak,
    review,
  });
}
