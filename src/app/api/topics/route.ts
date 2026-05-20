import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const topics = await prisma.topic.findMany({
    where: subjectId ? { subjectId: Number(subjectId) } : undefined,
    include: { _count: { select: { questions: true } } },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json(topics);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const topic = await prisma.topic.create({
    data: {
      subjectId: body.subjectId,
      name: body.name,
      displayOrder: body.displayOrder ?? 0,
    },
  });
  return NextResponse.json(topic, { status: 201 });
}
