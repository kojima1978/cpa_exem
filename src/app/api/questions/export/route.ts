import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") || "json";

  const questions = await prisma.question.findMany({
    include: {
      topic: { select: { name: true } },
      session: { select: { name: true } },
      choices: { orderBy: { displayOrder: "asc" } },
    },
    orderBy: { id: "asc" },
  });

  if (format === "csv") {
    const header =
      "topic,session,text,difficulty,briefExplanation,detailedExplanation,sourceReference,year,choice1,choice2,choice3,choice4,choice5,correct";
    const rows = questions.map((q) => {
      const correctIdx =
        q.choices.findIndex((c) => c.isCorrect) + 1;
      const choiceTexts = Array.from({ length: 5 }, (_, i) =>
        csvEscape(q.choices[i]?.text || "")
      );
      return [
        csvEscape(q.topic.name),
        csvEscape(q.session?.name || ""),
        csvEscape(q.text),
        q.difficulty,
        csvEscape(q.briefExplanation),
        csvEscape(q.detailedExplanation),
        csvEscape(q.sourceReference),
        q.year || "",
        ...choiceTexts,
        correctIdx,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=questions.csv",
      },
    });
  }

  const data = questions.map((q) => ({
    topic: q.topic.name,
    session: q.session?.name || null,
    text: q.text,
    difficulty: q.difficulty,
    briefExplanation: q.briefExplanation,
    detailedExplanation: q.detailedExplanation,
    sourceReference: q.sourceReference,
    year: q.year,
    choices: q.choices.map((c) => ({
      text: c.text,
      isCorrect: c.isCorrect,
    })),
  }));

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": "attachment; filename=questions.json",
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
