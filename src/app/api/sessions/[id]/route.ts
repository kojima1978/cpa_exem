import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const session = await prisma.session.update({
    where: { id: Number(id) },
    data: {
      name: body.name,
      description: body.description,
      displayOrder: body.displayOrder,
    },
  });
  return NextResponse.json(session);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.session.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
