import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMaterialsDir } from "@/lib/storage-path";

export const dynamic = "force-dynamic";

export async function GET() {
  const materials = await prisma.material.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  return NextResponse.json(materials);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") || "").trim();

    if (!file) {
      return NextResponse.json(
        { error: "PDFファイルが必要です" },
        { status: 400 },
      );
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: "PDFファイルのみアップロードできます" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const materialsDir = getMaterialsDir();
    await mkdir(materialsDir, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}.pdf`;
    await writeFile(join(materialsDir, fileName), buffer);

    const material = await prisma.material.create({
      data: {
        title: title || file.name.replace(/\.pdf$/i, ""),
        originalName: file.name,
        fileName,
        mimeType: "application/pdf",
        size: buffer.length,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "資料PDFのアップロードに失敗しました: " +
          (error instanceof Error ? error.message : "不明なエラー"),
      },
      { status: 500 },
    );
  }
}
