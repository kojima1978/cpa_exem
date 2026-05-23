import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSM2 } from "@/lib/sm2";

/**
 * POST /api/review/recalculate
 * One-time backfill: compute nextReviewAt for all questions with answer history.
 * Questions with no history remain nextReviewAt=null (= needs review).
 */
export async function POST() {
  const questions = await prisma.question.findMany({
    select: { id: true },
    where: {
      answerHistories: { some: {} },
    },
  });

  let updated = 0;

  for (const q of questions) {
    const histories = await prisma.answerHistory.findMany({
      where: { questionId: q.id },
      orderBy: { answeredAt: "desc" },
      select: { isCorrect: true, answeredAt: true },
    });

    if (histories.length === 0) continue;

    const sm2 = calculateSM2(
      histories.map((h) => h.isCorrect),
      histories[0].answeredAt,
    );

    await prisma.question.update({
      where: { id: q.id },
      data: { nextReviewAt: sm2.nextReviewAt },
    });

    updated++;
  }

  return NextResponse.json({ updated, total: questions.length });
}
