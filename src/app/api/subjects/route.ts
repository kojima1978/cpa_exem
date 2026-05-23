import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const subjects = await prisma.subject.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      _count: { select: { topics: true, sessions: true } },
    },
  });
  return NextResponse.json(subjects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const maxOrder = await prisma.subject.aggregate({ _max: { displayOrder: true } });
  const subject = await prisma.subject.create({
    data: {
      name: body.name,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
    },
  });
  return NextResponse.json(subject, { status: 201 });
}
