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
      sourceReference: body.sourceReference ?? "",
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

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const qId = Number(id);

  // Build partial update for question fields
  const data: Record<string, unknown> = {};
  if (body.text !== undefined) data.text = body.text;
  if (body.briefExplanation !== undefined)
    data.briefExplanation = body.briefExplanation;
  if (body.detailedExplanation !== undefined)
    data.detailedExplanation = body.detailedExplanation;
  if (body.sourceReference !== undefined)
    data.sourceReference = body.sourceReference;

  // Update question fields if any
  if (Object.keys(data).length > 0) {
    await prisma.question.update({ where: { id: qId }, data });
  }

  // Flip correct answer if isCorrect mapping provided
  // body.correctChoiceId: the choice ID that should be correct
  if (body.correctChoiceId !== undefined) {
    await prisma.choice.updateMany({
      where: { questionId: qId },
      data: { isCorrect: false },
    });
    await prisma.choice.update({
      where: { id: body.correctChoiceId },
      data: { isCorrect: true },
    });
  }

  const question = await prisma.question.findUnique({
    where: { id: qId },
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
