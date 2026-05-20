import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const topics = await prisma.topic.findMany({
    include: {
      questions: {
        include: {
          answerHistories: {
            select: { isCorrect: true },
          },
        },
      },
    },
    orderBy: { displayOrder: "asc" },
  });

  const stats = topics.map((topic) => {
    let totalAnswered = 0;
    let totalCorrect = 0;

    for (const q of topic.questions) {
      for (const h of q.answerHistories) {
        totalAnswered++;
        if (h.isCorrect) totalCorrect++;
      }
    }

    return {
      id: topic.id,
      name: topic.name,
      questionCount: topic.questions.length,
      totalAnswered,
      totalCorrect,
      accuracy:
        totalAnswered > 0
          ? Math.round((totalCorrect / totalAnswered) * 100)
          : null,
    };
  });

  return NextResponse.json(stats);
}
