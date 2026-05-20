import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const bookmarks = await prisma.bookmark.findMany({
    select: { questionId: true },
  });
  return NextResponse.json(bookmarks.map((b) => b.questionId));
}

export async function POST(request: NextRequest) {
  const { questionId } = await request.json();
  const bookmark = await prisma.bookmark.upsert({
    where: { questionId },
    update: {},
    create: { questionId },
  });
  return NextResponse.json(bookmark, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const questionId = Number(request.nextUrl.searchParams.get("questionId"));
  if (!questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }
  await prisma.bookmark.deleteMany({ where: { questionId } });
  return NextResponse.json({ ok: true });
}
