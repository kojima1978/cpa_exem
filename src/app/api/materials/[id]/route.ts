import { randomUUID } from "crypto";
import { access, mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMaterialsDir } from "@/lib/storage-path";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { questions: true } } },
  });

  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileExists = await access(join(getMaterialsDir(), material.fileName))
    .then(() => true)
    .catch(() => false);

  return NextResponse.json({ ...material, fileExists });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id: Number(id) },
  });

  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

    const nextFileName = `${Date.now()}-${randomUUID()}.pdf`;
    await writeFile(join(materialsDir, nextFileName), buffer);

    const updated = await prisma.material.update({
      where: { id: material.id },
      data: {
        title: title || material.title,
        originalName: file.name,
        fileName: nextFileName,
        mimeType: "application/pdf",
        size: buffer.length,
      },
      include: { _count: { select: { questions: true } } },
    });

    await unlink(join(materialsDir, material.fileName)).catch(() => {});

    return NextResponse.json({ ...updated, fileExists: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "資料PDFの差し替えに失敗しました: " +
          (error instanceof Error ? error.message : "不明なエラー"),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const material = await prisma.material.delete({
    where: { id: Number(id) },
  });

  try {
    await unlink(join(getMaterialsDir(), material.fileName));
  } catch {}

  return NextResponse.json({ ok: true });
}
