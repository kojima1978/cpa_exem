import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 「自信なし」マーク — 正解した問題を復習対象に戻す
 * nextReviewAt を今日にリセットして、次回復習で出題されるようにする
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const questionId = body.questionId;

  if (!questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.question.update({
    where: { id: questionId },
    data: { nextReviewAt: today },
  });

  return NextResponse.json({ ok: true });
}
