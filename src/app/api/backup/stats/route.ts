import { stat } from "fs/promises";
import { NextResponse } from "next/server";
import { getDbPath } from "@/lib/db-path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPath = getDbPath();
    const fileStats = await stat(dbPath);
    const questionCount = await prisma.question.count();
    const topicCount = await prisma.topic.count();

    return NextResponse.json({
      questionCount,
      topicCount,
      fileSize: fileStats.size,
      lastModified: fileStats.mtime.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "統計情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}
