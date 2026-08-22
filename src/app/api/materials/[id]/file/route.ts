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

  try {
    const buffer = await readFile(join(getMaterialsDir(), material.fileName));
    const safeName = basename(material.originalName).replace(/"/g, "");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "PDFファイルが見つかりません" },
      { status: 404 },
    );
  }
}
