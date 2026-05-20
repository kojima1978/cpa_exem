import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id: Number(id) },
    include: {
      topic: { select: { id: true, name: true } },
      session: { select: { id: true, name: true } },
      choices: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(question);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const qId = Number(id);

  await prisma.choice.deleteMany({ where: { questionId: qId } });

  const question = await prisma.question.update({
    where: { id: qId },
    data: {
      topicId: body.topicId,
      sessionId: body.sessionId || null,
      text: body.text,
      difficulty: body.difficulty ?? 1,
      briefExplanation: body.briefExplanation ?? "",
      detailedExplanation: body.detailedExplanation ?? "",
      year: body.year || null,
      choices: {
        create: body.choices.map(
          (c: { text: string; isCorrect: boolean }, i: number) => ({
            text: c.text,
            isCorrect: c.isCorrect,
            displayOrder: i + 1,
          })
        ),
      },
    },
    include: {
      topic: { select: { id: true, name: true } },
      session: { select: { id: true, name: true } },
      choices: { orderBy: { displayOrder: "asc" } },
    },
  });

  return NextResponse.json(question);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.question.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
