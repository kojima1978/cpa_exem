import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const choice = await prisma.choice.findUnique({
    where: { id: body.chosenChoiceId },
  });

  if (!choice) {
    return NextResponse.json({ error: "選択肢が見つかりません" }, { status: 400 });
  }

  const history = await prisma.answerHistory.create({
    data: {
      questionId: body.questionId,
      chosenChoiceId: body.chosenChoiceId,
      isCorrect: choice.isCorrect,
      timeSpent: body.timeSpent ?? null,
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  await prisma.studyStreak.upsert({
    where: { date: today },
    update: {
      questionCount: { increment: 1 },
      correctCount: { increment: choice.isCorrect ? 1 : 0 },
    },
    create: {
      date: today,
      questionCount: 1,
      correctCount: choice.isCorrect ? 1 : 0,
    },
  });

  return NextResponse.json({
    id: history.id,
    isCorrect: choice.isCorrect,
  });
}
