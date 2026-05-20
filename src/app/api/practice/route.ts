import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const topicId = sp.get("topicId");
  const sessionId = sp.get("sessionId");
  const difficulty = sp.get("difficulty");
  const mode = sp.get("mode") || "all";
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

  const where: Record<string, unknown> = {};
  if (topicId) where.topicId = Number(topicId);
  if (sessionId) where.sessionId = Number(sessionId);
  if (difficulty) where.difficulty = Number(difficulty);

  if (mode === "bookmarked") {
    where.bookmarks = { some: {} };
  } else if (mode === "wrong") {
    const wrongQuestionIds = await prisma.answerHistory.groupBy({
      by: ["questionId"],
      having: {
        isCorrect: { _min: { equals: false } },
      },
    });
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
    const wrongIds = wrongQuestionIds
      .map((g) => g.questionId)
      .filter((id) => lastAnswerMap.get(id) === false);
    if (wrongIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0 });
    }
    where.id = { in: wrongIds };
  }

  const total = await prisma.question.count({ where });

  const questions = await prisma.question.findMany({
    where,
    include: {
      topic: { select: { id: true, name: true } },
      session: { select: { id: true, name: true } },
      choices: { orderBy: { displayOrder: "asc" } },
      bookmarks: { select: { id: true } },
      answerHistories: {
        orderBy: { answeredAt: "desc" },
        take: 5,
        select: { isCorrect: true },
      },
    },
    take: limit,
  });

  const shuffled = questions
    .map((q) => ({ ...q, _sort: Math.random() }))
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort: _, ...q }) => q);

  return NextResponse.json({ questions: shuffled, total });
}
