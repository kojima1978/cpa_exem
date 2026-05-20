import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { text, topicId } = await request.json();

  if (!text || !topicId) {
    return NextResponse.json(
      { error: "テキストと分野IDが必要です" },
      { status: 400 }
    );
  }

  const topic = await prisma.topic.findUnique({ where: { id: Number(topicId) } });
  if (!topic) {
    return NextResponse.json({ error: "分野が見つかりません" }, { status: 400 });
  }

  const parsed = parseMaruBatsuText(text);

  if (parsed.questions.length === 0) {
    return NextResponse.json(
      { error: "問題が見つかりませんでした", imported: 0, errors: [], total: 0 },
      { status: 200 }
    );
  }

  let imported = 0;
  const errors: string[] = [];

  for (const q of parsed.questions) {
    try {
      const ans = parsed.answers.get(q.num);
      if (!ans) {
        errors.push(`問題${q.num}: 解答が見つかりません`);
        continue;
      }

      let sessionId: number | null = null;
      if (q.session) {
        const existing = await prisma.session.findFirst({
          where: { name: q.session, subjectId: topic.subjectId },
        });
        if (existing) {
          sessionId = existing.id;
        } else {
          const created = await prisma.session.create({
            data: { subjectId: topic.subjectId, name: q.session },
          });
          sessionId = created.id;
        }
      }

      await prisma.question.create({
        data: {
          topicId: Number(topicId),
          sessionId,
          text: q.text,
          difficulty: q.difficulty,
          briefExplanation: ans.explanation,
          detailedExplanation: ans.additional || "",
          year: q.year ?? null,
          choices: {
            create: [
              { text: "正しい", isCorrect: ans.isCorrect, displayOrder: 1 },
              { text: "誤り", isCorrect: !ans.isCorrect, displayOrder: 2 },
            ],
          },
        },
      });
      imported++;
    } catch (e) {
      errors.push(
        `問題${q.num}: ${e instanceof Error ? e.message : "不明なエラー"}`
      );
    }
  }

  return NextResponse.json({
    imported,
    errors,
    total: parsed.questions.length,
  });
}

type ParsedQuestion = {
  num: number;
  session: string;
  text: string;
  difficulty: number;
  year: number | null;
};

type ParsedAnswer = {
  isCorrect: boolean;
  explanation: string;
  additional: string;
};

/** Normalize OCR garbage before the 問題 keyword */
function normalizeLine(line: string): string {
  // Page markers like ①-3, ②-1 → skip (handled by caller)
  // Fix common OCR of ロロロ: i~1nn, DD口, DDD, Dn口, nrln, nnD, nnn, l~1nn etc.
  // Strategy: replace any run of [DdnNlri~1ロ□口■◻☐] before 問題 with ロロロ
  return line.replace(
    /^[DdnNlLrRiI~\-1ロ□口■◻☐\s]+(?=問題)/,
    "ロロロ "
  );
}

/** Normalize OCR errors in answer text (膜り→誤り, 娯り→誤り) */
function normalizeAnswer(text: string): string {
  return text
    .replace(/膜り/g, "誤り")
    .replace(/娯り/g, "誤り");
}

function parseMaruBatsuText(raw: string) {
  const lines = raw.split("\n");
  const questions: ParsedQuestion[] = [];
  const answers = new Map<number, ParsedAnswer>();

  let currentSession = "";
  let mode: "question" | "answer" = "question";
  let buffer: string[] = [];
  let currentQ: Partial<ParsedQuestion> | null = null;
  let currentA: { num: number; isCorrect: boolean; lines: string[] } | null =
    null;
  let additionalLines: string[] = [];
  let collectingAdditional = false;

  const QUESTION_META_RE = /^ロロロ\s*問題\s*(\d+)\s+重要度\s*([ABC])/;
  const ANSWER_RE = /^ロロロ\s*問題\s*(\d+)\s+(正しい|誤り)/;
  const SECTION_RE = /^(\d+)[.．]\s*(.+)/;
  const ADDITIONAL_RE = /^追加でチェック/;
  const PAGE_MARKER_RE = /^[①②③④⑤⑥⑦⑧⑨⑩]\s*[-ー]\s*\d+$/;
  const CHAPTER_HEADER_RE = /^[第\d]+章/;

  function flushQuestion() {
    if (currentQ && currentQ.num != null && buffer.length > 0) {
      questions.push({
        num: currentQ.num,
        session: currentQ.session || "",
        text: buffer.join("\n").trim(),
        difficulty: currentQ.difficulty || 2,
        year: currentQ.year ?? null,
      });
    }
    buffer = [];
    currentQ = null;
  }

  function flushAnswer() {
    if (currentA) {
      const existing = answers.get(currentA.num);
      const explanation = collectingAdditional
        ? existing?.explanation || ""
        : currentA.lines.join("\n").trim();
      const additional = collectingAdditional
        ? additionalLines.join("\n").trim()
        : "";

      if (existing && collectingAdditional) {
        existing.additional = additional;
      } else {
        answers.set(currentA.num, {
          isCorrect: currentA.isCorrect,
          explanation,
          additional,
        });
      }
    }
    currentA = null;
    additionalLines = [];
    collectingAdditional = false;
  }

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Skip page markers like ①-3, ②-1
    if (PAGE_MARKER_RE.test(line)) continue;

    // Skip standalone chapter headers (e.g. "第1章 ...")
    if (CHAPTER_HEADER_RE.test(line)) continue;

    // Skip standalone "問題" header
    if (line === "問題") continue;

    // Normalize OCR artifacts
    line = normalizeAnswer(normalizeLine(line));

    // Check if this is a question metadata line (with 重要度) → switch to question mode
    const questionMatch = line.match(QUESTION_META_RE);
    if (questionMatch) {
      if (mode === "answer") {
        flushAnswer();
        mode = "question";
      } else {
        flushQuestion();
      }
      const diffMap: Record<string, number> = { A: 3, B: 2, C: 1 };
      currentQ = {
        num: Number(questionMatch[1]),
        session: currentSession,
        difficulty: diffMap[questionMatch[2]] || 2,
        year: parseYear(line),
      };
      continue;
    }

    // Check if this is an answer line (with 正しい/誤り) → switch to answer mode
    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch) {
      if (mode === "question") {
        flushQuestion();
        mode = "answer";
      } else {
        flushAnswer();
      }
      currentA = {
        num: Number(answerMatch[1]),
        isCorrect: answerMatch[2] === "正しい",
        lines: [],
      };
      // Remaining text after 正しい/誤り on same line
      const afterAnswer = line.slice(answerMatch[0].length).trim();
      if (afterAnswer && !afterAnswer.match(/^[HR]\d+/) && afterAnswer !== "」") {
        currentA.lines.push(afterAnswer);
      }
      collectingAdditional = false;
      continue;
    }

    // Check for additional check section
    if (ADDITIONAL_RE.test(line)) {
      if (currentA) {
        const existingExplanation = currentA.lines.join("\n").trim();
        answers.set(currentA.num, {
          isCorrect: currentA.isCorrect,
          explanation: existingExplanation,
          additional: "",
        });
        collectingAdditional = true;
        additionalLines = [];
      }
      continue;
    }

    // In answer mode
    if (mode === "answer") {
      if (collectingAdditional) {
        additionalLines.push(line);
      } else if (currentA) {
        currentA.lines.push(line);
      }
      continue;
    }

    // In question mode — check for section header
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch && !line.includes("問題") && !line.includes("重要度")) {
      flushQuestion();
      currentSession = sectionMatch[2].trim();
      continue;
    }

    // Regular text line — append to question buffer
    if (currentQ) {
      buffer.push(line);
    }
  }

  // Flush remaining
  if (mode === "question") {
    flushQuestion();
  } else {
    flushAnswer();
  }

  return { questions, answers };
}

function parseYear(text: string): number | null {
  const heiseiMatch = text.match(/H(\d+)/);
  if (heiseiMatch) return Number(heiseiMatch[1]) + 1988;

  const reiwaMatch = text.match(/R(\d+)/);
  if (reiwaMatch) return Number(reiwaMatch[1]) + 2018;

  return null;
}
