import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSM2 } from "@/lib/sm2";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const skipped = !!body.skipped;

  let isCorrect = false;
  let chosenChoiceId = 0;

  if (skipped) {
    // "わからない" — treated as wrong, use first choice as placeholder
    const firstChoice = await prisma.choice.findFirst({
      where: { questionId: body.questionId },
      orderBy: { displayOrder: "asc" },
    });
    if (!firstChoice) {
      return NextResponse.json({ error: "選択肢が見つかりません" }, { status: 400 });
    }
    chosenChoiceId = firstChoice.id;
    isCorrect = false;
  } else {
    const choice = await prisma.choice.findUnique({
      where: { id: body.chosenChoiceId },
    });

    if (!choice) {
      return NextResponse.json({ error: "選択肢が見つかりません" }, { status: 400 });
    }
    chosenChoiceId = choice.id;
    isCorrect = choice.isCorrect;
  }

  const history = await prisma.answerHistory.create({
    data: {
      questionId: body.questionId,
      chosenChoiceId,
      isCorrect,
      timeSpent: body.timeSpent ?? null,
    },
  });

  // Update nextReviewAt via SM-2
  const allHistories = await prisma.answerHistory.findMany({
    where: { questionId: body.questionId },
    orderBy: { answeredAt: "desc" },
    select: { isCorrect: true, answeredAt: true },
  });
  const sm2 = calculateSM2(
    allHistories.map((h) => h.isCorrect),
    allHistories[0].answeredAt,
  );
  await prisma.question.update({
    where: { id: body.questionId },
    data: { nextReviewAt: sm2.nextReviewAt },
  });

  const today = new Date().toISOString().slice(0, 10);
  await prisma.studyStreak.upsert({
    where: { date: today },
    update: {
      questionCount: { increment: 1 },
      correctCount: { increment: isCorrect ? 1 : 0 },
    },
    create: {
      date: today,
      questionCount: 1,
      correctCount: isCorrect ? 1 : 0,
    },
  });

  return NextResponse.json({
    id: history.id,
    isCorrect,
  });
}
