import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 20)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const questions = await prisma.question.findMany({
    include: {
      topic: { select: { id: true, name: true } },
      session: { select: { id: true, name: true } },
      choices: { orderBy: { displayOrder: "asc" } },
      bookmarks: { select: { id: true } },
      answerHistories: {
        orderBy: { answeredAt: "desc" },
        select: { isCorrect: true, answeredAt: true },
      },
    },
  });

  const reviewQueue: typeof questions = [];

  for (const q of questions) {
    const histories = q.answerHistories;
    if (histories.length === 0) {
      reviewQueue.push(q);
      continue;
    }

    const { interval } = calculateSM2(histories.map((h) => h.isCorrect));
    const lastAnswered = new Date(histories[0].answeredAt);
    const nextReview = new Date(lastAnswered.getTime() + interval * 86400000);

    if (nextReview <= today) {
      reviewQueue.push(q);
    }
  }

  const shuffled = reviewQueue
    .map((q) => ({ ...q, _sort: Math.random() }))
    .sort((a, b) => a._sort - b._sort)
    .slice(0, limit)
    .map(({ _sort: _, ...q }) => q);

  return NextResponse.json({
    questions: shuffled,
    total: reviewQueue.length,
  });
}

function calculateSM2(answers: boolean[]): { interval: number; easeFactor: number } {
  let easeFactor = 2.5;
  let interval = 1;
  let consecutiveCorrect = 0;

  const chronological = [...answers].reverse();

  for (const isCorrect of chronological) {
    if (isCorrect) {
      consecutiveCorrect++;
      if (consecutiveCorrect === 1) {
        interval = 1;
      } else if (consecutiveCorrect === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      easeFactor = Math.max(1.3, easeFactor + 0.1);
    } else {
      consecutiveCorrect = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }
  }

  return { interval, easeFactor };
}
