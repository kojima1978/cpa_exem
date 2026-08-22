import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") || "json";

  const questions = await prisma.question.findMany({
    include: {
      topic: { select: { name: true, subject: { select: { name: true } } } },
      session: { select: { name: true } },
      material: { select: { title: true, originalName: true } },
      choices: { orderBy: { displayOrder: "asc" } },
    },
    orderBy: { id: "asc" },
  });

  if (format === "csv") {
    const header =
      "subject,topic,session,text,difficulty,briefExplanation,detailedExplanation,sourceReference,sourcePdf,sourcePage,year,choiceA,choiceB,choiceC,choiceD,choiceE,correctAnswer";
    const rows = questions.map((q) => {
      const correctIdx = q.choices.findIndex((c) => c.isCorrect);
      const correctAnswer = ["A", "B", "C", "D", "E"][correctIdx] || "";
      const choiceTexts = Array.from({ length: 5 }, (_, i) =>
        csvEscape(q.choices[i]?.text || "")
      );
      return [
        csvEscape(q.topic.subject.name),
        csvEscape(q.topic.name),
        csvEscape(q.session?.name || ""),
        csvEscape(q.text),
        q.difficulty,
        csvEscape(q.briefExplanation),
        csvEscape(q.detailedExplanation),
        csvEscape(q.sourceReference),
        csvEscape(q.material?.title || q.material?.originalName || ""),
        q.sourcePage || "",
        q.year || "",
        ...choiceTexts,
        correctAnswer,
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
    subject: q.topic.subject.name,
    topic: q.topic.name,
    session: q.session?.name || null,
    text: q.text,
    difficulty: q.difficulty,
    briefExplanation: q.briefExplanation,
    detailedExplanation: q.detailedExplanation,
    sourceReference: q.sourceReference,
    sourcePdf: q.material?.title || q.material?.originalName || null,
    sourcePage: q.sourcePage,
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
