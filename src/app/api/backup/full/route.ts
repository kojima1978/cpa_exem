import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { getDbPath } from "@/lib/db-path";
import { getMaterialsDir } from "@/lib/storage-path";
import { createZip } from "@/lib/zip";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPath = getDbPath();
    const materialsDir = getMaterialsDir();
    const entries = [
      {
        name: "cpa-exam.db",
        data: await readFile(dbPath),
      },
    ];

    try {
      const files = await readdir(materialsDir);
      for (const fileName of files) {
        const filePath = join(materialsDir, fileName);
        const fileStats = await stat(filePath);
        if (fileStats.isFile()) {
          entries.push({
            name: `materials/${fileName}`,
            data: await readFile(filePath),
          });
        }
      }
    } catch {}

    entries.push({
      name: "backup-manifest.json",
      data: Buffer.from(
        JSON.stringify(
          {
            format: "cpa-exam-full-backup",
            version: 1,
            createdAt: new Date().toISOString(),
            files: entries.map((entry) => entry.name),
          },
          null,
          2,
        ),
      ),
    });

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const zip = createZip(entries);
    const body = zip.buffer.slice(
      zip.byteOffset,
      zip.byteOffset + zip.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=cpa-exam-full-backup-${date}.zip`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "フルバックアップの作成に失敗しました" },
      { status: 500 },
    );
  }
}
