import { NextRequest, NextResponse } from "next/server";
import { basename, join } from "path";
import { copyFile, mkdir, readdir, writeFile, unlink } from "fs/promises";
import { getDbPath } from "@/lib/db-path";
import { prisma } from "@/lib/prisma";
import { getMaterialsDir } from "@/lib/storage-path";
import { readStoredZip, type ZipEntry } from "@/lib/zip";

const SQLITE_MAGIC = "SQLite format 3\0";
const ZIP_MAGIC = "PK\x03\x04";

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
    const backup = parseBackup(buffer);

    // SQLiteマジックバイト検証（先頭16バイト）
    const magic = backup.db.subarray(0, 16).toString("ascii");
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
    await writeFile(dbPath, backup.db);

    if (backup.materials) {
      await restoreMaterials(backup.materials);
    }

    // Prisma再接続
    await prisma.$connect();

    // 復元後の問題数を取得
    const questionCount = await prisma.question.count();
    const materialCount = await prisma.material.count();

    return NextResponse.json({
      success: true,
      message: `復元が完了しました（${questionCount}問 / PDF資料${materialCount}件）`,
      questionCount,
      materialCount,
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

function parseBackup(buffer: Buffer): { db: Buffer; materials?: ZipEntry[] } {
  if (buffer.subarray(0, 4).toString("latin1") !== ZIP_MAGIC) {
    return { db: buffer };
  }

  const entries = readStoredZip(buffer);
  const dbEntry =
    entries.find((entry) => entry.name === "cpa-exam.db") ??
    entries.find((entry) => entry.name.toLowerCase().endsWith(".db"));

  if (!dbEntry) {
    throw new Error("ZIP内にSQLiteバックアップが見つかりません");
  }

  return {
    db: dbEntry.data,
    materials: entries.filter((entry) => entry.name.startsWith("materials/")),
  };
}

async function restoreMaterials(entries: ZipEntry[]) {
  const materialsDir = getMaterialsDir();
  await mkdir(materialsDir, { recursive: true });

  try {
    const currentFiles = await readdir(materialsDir);
    await Promise.all(
      currentFiles.map((fileName) => unlink(join(materialsDir, fileName)).catch(() => {})),
    );
  } catch {}

  for (const entry of entries) {
    const fileName = basename(entry.name);
    if (!fileName || entry.name !== `materials/${fileName}`) continue;
    await writeFile(join(materialsDir, fileName), entry.data);
  }
}
