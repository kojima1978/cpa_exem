import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get("days") || 30);

  const streaks = await prisma.studyStreak.findMany({
    orderBy: { date: "desc" },
    take: days,
  });

  return NextResponse.json(
    streaks.map((s) => ({
      date: s.date,
      questionCount: s.questionCount,
      correctCount: s.correctCount,
      accuracy:
        s.questionCount > 0
          ? Math.round((s.correctCount / s.questionCount) * 100)
          : 0,
    }))
  );
}
