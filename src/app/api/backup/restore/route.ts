import { NextRequest, NextResponse } from "next/server";
import { copyFile, writeFile, unlink } from "fs/promises";
import { getDbPath } from "@/lib/db-path";
import { prisma } from "@/lib/prisma";

const SQLITE_MAGIC = "SQLite format 3\0";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが必要です" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // SQLiteマジックバイト検証（先頭16バイト）
    const magic = buffer.subarray(0, 16).toString("ascii");
    if (magic !== SQLITE_MAGIC) {
      return NextResponse.json(
        { error: "有効なSQLiteファイルではありません" },
        { status: 400 },
      );
    }

    const dbPath = getDbPath();

    // 復元前に現在のDBを自動バックアップ
    await copyFile(dbPath, dbPath + ".bak");

    // Prisma切断（ファイルロック解放）
    await prisma.$disconnect();

    // WAL/SHMファイルがあれば削除（クリーン復元のため）
    try {
      await unlink(dbPath + "-wal");
    } catch {}
    try {
      await unlink(dbPath + "-shm");
    } catch {}

    // DBファイルを上書き
    await writeFile(dbPath, buffer);

    // Prisma再接続
    await prisma.$connect();

    // 復元後の問題数を取得
    const questionCount = await prisma.question.count();

    return NextResponse.json({
      success: true,
      message: `復元が完了しました（${questionCount}問）`,
      questionCount,
    });
  } catch (error) {
    // エラー時もPrisma再接続を試みる
    try {
      await prisma.$connect();
    } catch {}

    return NextResponse.json(
      {
        error:
          "復元に失敗しました: " +
          (error instanceof Error ? error.message : "不明なエラー"),
      },
      { status: 500 },
    );
  }
}
