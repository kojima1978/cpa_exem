import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const subject = await prisma.subject.update({
    where: { id: Number(id) },
    data: {
      name: body.name,
      displayOrder: body.displayOrder,
    },
  });
  return NextResponse.json(subject);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const count = await prisma.topic.count({ where: { subjectId: Number(id) } });
  if (count > 0) {
    return NextResponse.json(
      { error: "この科目にはまだ分野が登録されています。先に分野を削除してください。" },
      { status: 400 },
    );
  }
  await prisma.subject.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
