import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const questionId = request.nextUrl.searchParams.get("questionId");
  if (!questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  const histories = await prisma.answerHistory.findMany({
    where: { questionId: Number(questionId) },
    orderBy: { answeredAt: "desc" },
    take: 5,
    select: { isCorrect: true, answeredAt: true },
  });

  return NextResponse.json(histories);
}
