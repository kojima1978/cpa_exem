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
    const text = await request.text();
    try {
      items = normalizeImportQuestions(parseJsonImportText(text));
    } catch {
      return NextResponse.json(
        { error: "JSON形式を読み取れませんでした" },
        { status: 400 }
      );
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "配列形式のデータが必要です" },
      { status: 400 }
    );
  }

  const subjects = await prisma.subject.findMany();
  const subjectCache = new Map(subjects.map((s) => [s.name, s.id]));
  const defaultSubjectId = subjects[0]?.id;
  const hasItemWithoutSubject = items.some((item) => !item.subject?.trim());
  if (!defaultSubjectId && hasItemWithoutSubject) {
    return NextResponse.json(
      { error: "科目が存在しません。JSONにsubjectを指定してください" },
      { status: 400 }
    );
  }

  const materials = await prisma.material.findMany();
  const materialCache = new Map<string, number>();
  for (const material of materials) {
    materialCache.set(normalizeMaterialName(material.title), material.id);
    materialCache.set(normalizeMaterialName(material.originalName), material.id);
    materialCache.set(normalizeMaterialName(material.fileName), material.id);
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

      let subjectId = defaultSubjectId ?? 0;
      if (item.subject?.trim()) {
        const subjectName = item.subject.trim();
        const cachedSubjectId = subjectCache.get(subjectName);
        if (cachedSubjectId) {
          subjectId = cachedSubjectId;
        } else {
          const newSubject = await prisma.subject.create({
            data: { name: subjectName },
          });
          subjectCache.set(subjectName, newSubject.id);
          subjectId = newSubject.id;
        }
      }
      if (!subjectId) {
        errors.push(`#${i + 1}: 科目がありません`);
        continue;
      }

      let topicId: number;
      const existingTopic = await prisma.topic.findFirst({
        where: { name: item.topic, subjectId },
      });
      if (existingTopic) {
        topicId = existingTopic.id;
      } else {
        const newTopic = await prisma.topic.create({
          data: { subjectId, name: item.topic },
        });
        topicId = newTopic.id;
      }

      let sessionId: number | null = null;
      if (item.session) {
        const existingSession = await prisma.session.findFirst({
          where: { name: item.session, subjectId },
        });
        if (existingSession) {
          sessionId = existingSession.id;
        } else {
          const newSession = await prisma.session.create({
            data: { subjectId, name: item.session },
          });
          sessionId = newSession.id;
        }
      }

      const materialId = item.sourcePdf
        ? materialCache.get(normalizeMaterialName(item.sourcePdf)) ?? null
        : null;
      const sourceReference =
        item.sourceReference?.trim() ||
        (item.sourcePdf && !materialId ? `PDF: ${item.sourcePdf}` : "");

      await prisma.question.create({
        data: {
          topicId,
          sessionId,
          materialId,
          text: item.text,
          difficulty: parseImportDifficulty(item.difficulty),
          briefExplanation: item.briefExplanation ?? "",
          detailedExplanation: item.detailedExplanation ?? "",
          sourceReference,
          sourcePage: Number(item.sourcePage) || null,
          year: Number(item.year) || null,
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
  const rows = parseCSVRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => normalizeHeader(h));
  const questions: ImportQuestion[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const row: Record<string, string> = {};
    headers.forEach((h, j) => (row[h] = values[j] || ""));

    const choices = parseChoices(row);

    const textValue = getRowValue(row, "text", "question", "questiontext", "問題文");
    if (textValue && choices.length > 0) {
      questions.push({
        subject: getRowValue(row, "subject", "科目") || undefined,
        topic: getRowValue(row, "topic", "分野") || "未分類",
        session: getRowValue(row, "session", "学習単位") || undefined,
        text: textValue,
        difficulty: parseDifficulty(getRowValue(row, "difficulty", "重要度")),
        briefExplanation: getRowValue(row, "briefexplanation", "簡易解説") || "",
        detailedExplanation:
          getRowValue(row, "detailedexplanation", "explanation", "解説") || "",
        sourceReference:
          getRowValue(row, "sourcereference", "根拠条文", "参照") || "",
        sourcePdf:
          getRowValue(row, "sourcepdf", "pdf", "material", "資料pdf") ||
          undefined,
        sourcePage:
          Number(getRowValue(row, "sourcepage", "page", "ページ")) || undefined,
        year: Number(getRowValue(row, "year", "年度")) || undefined,
        choices,
      });
    }
  }

  return questions;
}

function parseJsonImportText(text: string): unknown {
  const trimmed = text.trim().replace(/^\uFEFF/, "");
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() || trimmed;

  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf("[");
    const end = body.lastIndexOf("]");
    if (start >= 0 && end > start) {
      return JSON.parse(body.slice(start, end + 1));
    }
    throw new Error("Invalid JSON");
  }
}

function normalizeImportQuestions(value: unknown): ImportQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeImportQuestion(item))
    .filter((item): item is ImportQuestion => item !== null);
}

function normalizeImportQuestion(value: unknown): ImportQuestion | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const text = asString(row.text) || asString(row.question);
  const answer = row.answer ?? row.correctAnswer ?? row.correct;
  const choices = normalizeJsonChoices(row.choices ?? row.options, answer);
  if (!text || choices.length === 0) return null;

  return {
    subject: asString(row.subject) || undefined,
    topic: asString(row.topic) || "未分類",
    session: asString(row.session) || undefined,
    text,
    difficulty: parseImportDifficulty(row.difficulty),
    briefExplanation:
      asString(row.briefExplanation) || asString(row.explanation) || "",
    detailedExplanation:
      asString(row.detailedExplanation) || asString(row.explanation) || "",
    sourceReference: asString(row.sourceReference) || "",
    sourcePdf: asString(row.sourcePdf) || undefined,
    sourcePage: Number(row.sourcePage) || undefined,
    year: Number(row.year) || undefined,
    choices,
  };
}

function normalizeJsonChoices(value: unknown, answer: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((choice, index) => {
      const text =
        typeof choice === "string"
          ? choice
          : choice && typeof choice === "object"
            ? asString((choice as Record<string, unknown>).text) ||
              asString((choice as Record<string, unknown>).label)
            : "";
      if (!text) return null;

      const explicitCorrect =
        choice &&
        typeof choice === "object" &&
        (choice as Record<string, unknown>).isCorrect === true;

      return {
        text,
        isCorrect: explicitCorrect || matchesAnswer(answer, text, index),
      };
    })
    .filter(
      (choice): choice is { text: string; isCorrect: boolean } =>
        choice !== null,
    );
}

function matchesAnswer(answer: unknown, choiceText: string, index: number) {
  if (answer == null || answer === "") return false;
  const letters = ["A", "B", "C", "D", "E"];
  if (typeof answer === "number") return answer === index + 1;

  const normalizedAnswer = String(answer).trim().toUpperCase();
  const numericAnswer = Number(normalizedAnswer);
  if (Number.isInteger(numericAnswer)) return numericAnswer === index + 1;

  const letterIndex = letters.indexOf(normalizedAnswer);
  if (letterIndex >= 0) return letterIndex === index;
  if (/^[A-E][).．、:\s]/.test(normalizedAnswer)) {
    return letters[index] === normalizedAnswer[0];
  }

  const normalizedChoice = choiceText.trim().toUpperCase();
  return normalizedAnswer === normalizedChoice;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseChoices(row: Record<string, string>) {
  const letterAnswer = getRowValue(
    row,
    "correctanswer",
    "correct_answer",
    "answer",
    "正解",
  )
    .trim()
    .toUpperCase();

  const letterChoices: { text: string; isCorrect: boolean }[] = [];
  for (const letter of ["A", "B", "C", "D", "E"]) {
    const choiceText = getRowValue(row, `choice${letter.toLowerCase()}`);
    if (choiceText) {
      letterChoices.push({
        text: choiceText,
        isCorrect:
          letterAnswer === letter ||
          letterAnswer === choiceText.trim().toUpperCase(),
      });
    }
  }
  if (letterChoices.length > 0) return letterChoices;

  const numericAnswer = getRowValue(row, "correct").trim();
  const choices: { text: string; isCorrect: boolean }[] = [];
  for (let n = 1; n <= 5; n++) {
    const choiceText = getRowValue(row, `choice${n}`);
    if (choiceText) {
      choices.push({
        text: choiceText,
        isCorrect: numericAnswer === String(n),
      });
    }
  }

  return choices;
}

function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current.trim());
      current = "";
    } else if (char === "\n") {
      row.push(current.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      current = "";
    } else if (char !== "\r") {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().replace(/^\uFEFF/, "").replace(/^"|"$/g, "").toLowerCase();
}

function getRowValue(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value !== undefined) return value.trim();
  }
  return "";
}

function parseDifficulty(value: string) {
  const v = value.trim().toUpperCase();
  if (v === "A") return 1;
  if (v === "B") return 2;
  if (v === "C") return 3;
  return Number(v) || 1;
}

function parseImportDifficulty(value: unknown) {
  if (typeof value === "string") return parseDifficulty(value);
  return Number(value) || 1;
}

function normalizeMaterialName(value: string) {
  return value.trim().toLowerCase().replace(/\.pdf$/i, "");
}
