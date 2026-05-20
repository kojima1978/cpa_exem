import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ImportQuestion } from "@/types";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let items: ImportQuestion[];

  if (contentType.includes("text/csv")) {
    const text = await request.text();
    items = parseCSV(text);
  } else {
    items = await request.json();
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "配列形式のデータが必要です" },
      { status: 400 }
    );
  }

  const subjects = await prisma.subject.findMany();
  const defaultSubjectId = subjects[0]?.id;
  if (!defaultSubjectId) {
    return NextResponse.json(
      { error: "科目が存在しません。先にシードデータを作成してください" },
      { status: 400 }
    );
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (!item.text || !item.choices?.length) {
        errors.push(`#${i + 1}: 問題文または選択肢がありません`);
        continue;
      }

      const hasCorrect = item.choices.some((c) => c.isCorrect);
      if (!hasCorrect) {
        errors.push(`#${i + 1}: 正解の選択肢がありません`);
        continue;
      }

      let topicId: number;
      const existingTopic = await prisma.topic.findFirst({
        where: { name: item.topic, subjectId: defaultSubjectId },
      });
      if (existingTopic) {
        topicId = existingTopic.id;
      } else {
        const newTopic = await prisma.topic.create({
          data: { subjectId: defaultSubjectId, name: item.topic },
        });
        topicId = newTopic.id;
      }

      let sessionId: number | null = null;
      if (item.session) {
        const existingSession = await prisma.session.findFirst({
          where: { name: item.session, subjectId: defaultSubjectId },
        });
        if (existingSession) {
          sessionId = existingSession.id;
        } else {
          const newSession = await prisma.session.create({
            data: { subjectId: defaultSubjectId, name: item.session },
          });
          sessionId = newSession.id;
        }
      }

      await prisma.question.create({
        data: {
          topicId,
          sessionId,
          text: item.text,
          difficulty: item.difficulty ?? 1,
          briefExplanation: item.briefExplanation ?? "",
          detailedExplanation: item.detailedExplanation ?? "",
          year: item.year ?? null,
          choices: {
            create: item.choices.map((c, j) => ({
              text: c.text,
              isCorrect: c.isCorrect,
              displayOrder: j + 1,
            })),
          },
        },
      });
      imported++;
    } catch (e) {
      errors.push(`#${i + 1}: ${e instanceof Error ? e.message : "不明なエラー"}`);
    }
  }

  return NextResponse.json({ imported, errors, total: items.length });
}

function parseCSV(text: string): ImportQuestion[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const questions: ImportQuestion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => (row[h] = values[j] || ""));

    const choices: { text: string; isCorrect: boolean }[] = [];
    for (let n = 1; n <= 5; n++) {
      const choiceText = row[`choice${n}`];
      if (choiceText) {
        choices.push({
          text: choiceText,
          isCorrect: String(row.correct) === String(n),
        });
      }
    }

    if (row.text && choices.length > 0) {
      questions.push({
        topic: row.topic || "未分類",
        session: row.session || undefined,
        text: row.text,
        difficulty: Number(row.difficulty) || 1,
        briefExplanation: row.briefExplanation || "",
        detailedExplanation: row.detailedExplanation || "",
        year: Number(row.year) || undefined,
        choices,
      });
    }
  }

  return questions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}
