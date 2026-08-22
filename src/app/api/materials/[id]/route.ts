import { unlink } from "fs/promises";
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

  return NextResponse.json(material);
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
