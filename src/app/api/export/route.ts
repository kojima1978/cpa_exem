import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const subjects = await prisma.subject.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      topics: {
        orderBy: { displayOrder: "asc" },
        include: {
          questions: {
            orderBy: { id: "asc" },
            include: {
              session: { select: { name: true } },
              choices: {
                orderBy: { displayOrder: "asc" },
                select: { text: true, isCorrect: true, displayOrder: true },
              },
            },
          },
        },
      },
    },
  });

  const data = {
    exportedAt: new Date().toISOString(),
    totalQuestions: 0,
    subjects: subjects.map((s) => {
      const topics = s.topics.map((t) => {
        const questions = t.questions.map((q) => ({
          text: q.text,
          difficulty: q.difficulty,
          session: q.session?.name ?? null,
          briefExplanation: q.briefExplanation || null,
          detailedExplanation: q.detailedExplanation || null,
          sourceReference: q.sourceReference || null,
          year: q.year,
          choices: q.choices.map((c) => ({
            text: c.text,
            isCorrect: c.isCorrect,
            displayOrder: c.displayOrder,
          })),
        }));
        return { name: t.name, questionCount: questions.length, questions };
      });
      const questionCount = topics.reduce((s, t) => s + t.questionCount, 0);
      return { name: s.name, questionCount, topics };
    }),
  };

  data.totalQuestions = data.subjects.reduce((s, x) => s + x.questionCount, 0);

  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cpa-exam-export-${date}.json"`,
    },
  });
}
