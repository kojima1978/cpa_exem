import { readFile } from "fs/promises";
import { basename, join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMaterialsDir } from "@/lib/storage-path";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id: Number(id) },
  });

  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(join(getMaterialsDir(), material.fileName));
  } catch {
    return NextResponse.json(
      { error: "PDFファイルが見つかりません" },
      { status: 404 },
    );
  }

  const safeName = basename(material.originalName).replace(/"/g, "");
  const body = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([body], { type: "application/pdf" });

  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=300",
    },
  });
}
