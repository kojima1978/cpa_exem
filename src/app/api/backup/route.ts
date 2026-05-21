import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getDbPath } from "@/lib/db-path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPath = getDbPath();
    const buffer = await readFile(dbPath);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=cpa-exam-backup-${date}.db`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "バックアップの作成に失敗しました" },
      { status: 500 },
    );
  }
}
