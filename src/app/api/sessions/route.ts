import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const sessions = await prisma.session.findMany({
    where: subjectId ? { subjectId: Number(subjectId) } : undefined,
    include: { _count: { select: { questions: true } } },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const session = await prisma.session.create({
    data: {
      subjectId: body.subjectId,
      name: body.name,
      description: body.description ?? "",
      displayOrder: body.displayOrder ?? 0,
    },
  });
  return NextResponse.json(session, { status: 201 });
}
