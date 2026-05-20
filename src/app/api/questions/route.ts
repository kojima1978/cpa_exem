import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const topicId = sp.get("topicId");
  const sessionId = sp.get("sessionId");
  const difficulty = sp.get("difficulty");
  const search = sp.get("search");
  const page = Math.max(1, Number(sp.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

  const where: Record<string, unknown> = {};
  if (topicId) where.topicId = Number(topicId);
  if (sessionId) where.sessionId = Number(sessionId);
  if (difficulty) where.difficulty = Number(difficulty);
  if (search) where.text = { contains: search };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        topic: { select: { id: true, name: true } },
        session: { select: { id: true, name: true } },
        choices: { orderBy: { displayOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({
    questions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const question = await prisma.question.create({
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

  return NextResponse.json(question, { status: 201 });
}
