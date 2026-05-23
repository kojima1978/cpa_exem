import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { weightedSelect } from "@/lib/weighted-shuffle";

export async function GET(request: NextRequest) {
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 20)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // nextReviewAt IS NULL → never answered (needs review)
  // nextReviewAt <= today → review interval has elapsed
  const where = {
    OR: [
      { nextReviewAt: null },
      { nextReviewAt: { lte: today } },
    ],
  };

  const total = await prisma.question.count({ where });

  // Phase 1: lightweight query for weighted selection
  const pool = await prisma.question.findMany({
    where,
    select: { id: true, difficulty: true },
  });

  // Phase 2: weighted random selection
  const selectedIds = weightedSelect(pool, limit);

  if (selectedIds.length === 0) {
    return NextResponse.json({ questions: [], total });
  }

  // Phase 3: fetch full data for selected IDs
  const questions = await prisma.question.findMany({
    where: { id: { in: selectedIds } },
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
  });

  // Maintain weighted order from Phase 2
  const orderMap = new Map(selectedIds.map((id, i) => [id, i]));
  questions.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return NextResponse.json({ questions, total });
}
