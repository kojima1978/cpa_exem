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
          sourceReference: ans.sourceReference || "",
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
  sourceReference: string;
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
  let currentA: { num: number; isCorrect: boolean; lines: string[]; sourceReference: string } | null =
    null;
  let additionalLines: string[] = [];
  let collectingAdditional = false;
  let judgmentAnswerNum: number | null = null;
  let comboProblemNum: number | null = null;
  let comboCorrectLabels = new Set<string>();
  let isJudgmentQuestion = false;

  const QUESTION_META_RE = /^ロロロ\s*問題\s*(\d+)\s+重要度\s*([ABC])/;
  const ANSWER_RE = /^ロロロ\s*問題\s*(\d+)\s+(正しい|誤り)/;
  const SECTION_RE = /^(\d+)[.．]\s*(.+)/;
  const ADDITIONAL_RE = /^追加でチェック/;
  const PAGE_MARKER_RE = /^[①②③④⑤⑥⑦⑧⑨⑩]\s*[-ー]\s*\d+$/;
  const CHAPTER_HEADER_RE = /^[第\d]+章/;
  const JUDGMENT_ANSWER_RE = /^ロロロ\s*問題\s*(\d+)\s*$/;
  const ITEM_LABEL_RE = /^([アイウエオカキクケコ])[.．]\s*(.+)/;
  const KATAKANA_LABELS = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ'];
  const COMBO_ANSWER_RE = /^ロロロ\s*問題\s*(\d+)\s+正解\s*(.*)/;
  const COMBO_ITEM_RE = /^([アイウエオカキクケコ])[.．]?\s*([×○])\s*(.*)/;

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
          sourceReference: currentA.sourceReference || "",
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

    // Skip bracketed section headers (e.g. "[1.セクション名]")
    if (/^\[\d+[.．].*\]$/.test(line)) continue;

    // Normalize OCR artifacts
    line = normalizeAnswer(normalizeLine(line));

    // Check if this is a question metadata line (with 重要度) → switch to question mode
    const questionMatch = line.match(QUESTION_META_RE);
    if (questionMatch) {
      if (mode === "answer") {
        flushAnswer();
        judgmentAnswerNum = null;
        comboProblemNum = null;
        mode = "question";
      } else {
        flushQuestion();
      }
      isJudgmentQuestion = false;
      const diffMap: Record<string, number> = { A: 1, B: 2, C: 3 };
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
      judgmentAnswerNum = null;
      comboProblemNum = null;
      // Remaining text after 正しい/誤り on same line = source reference (根拠条文)
      const afterAnswer = line.slice(answerMatch[0].length).trim();
      currentA = {
        num: Number(answerMatch[1]),
        isCorrect: answerMatch[2] === "正しい",
        lines: [],
        sourceReference: afterAnswer || "",
      };
      collectingAdditional = false;
      continue;
    }

    // Check for judgment answer header (問題N without 正しい/誤り)
    const judgmentAnswerMatch = line.match(JUDGMENT_ANSWER_RE);
    if (judgmentAnswerMatch) {
      if (mode === "question") {
        flushQuestion();
        mode = "answer";
      } else {
        flushAnswer();
      }
      judgmentAnswerNum = Number(judgmentAnswerMatch[1]);
      comboProblemNum = null;
      continue;
    }

    // Check for combination answer header (問題N 正解N)
    const comboAnswerMatch = line.match(COMBO_ANSWER_RE);
    if (comboAnswerMatch) {
      if (mode === "question") {
        flushQuestion();
        mode = "answer";
      } else {
        flushAnswer();
      }
      comboProblemNum = Number(comboAnswerMatch[1]);
      judgmentAnswerNum = null;
      // Parse correct labels from answer text (e.g. "イ", "3 (イとウ)")
      const answerInfo = comboAnswerMatch[2].trim();
      comboCorrectLabels = new Set<string>();
      for (const ch of answerInfo) {
        if (KATAKANA_LABELS.includes(ch)) {
          comboCorrectLabels.add(ch);
        }
      }
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
          sourceReference: currentA.sourceReference || "",
        });
        collectingAdditional = true;
        additionalLines = [];
      }
      continue;
    }

    // In answer mode — check for judgment sub-item (ア～ケ)
    if (mode === "answer" && judgmentAnswerNum != null) {
      const itemMatch = line.match(ITEM_LABEL_RE);
      if (itemMatch) {
        flushAnswer();
        const label = itemMatch[1];
        const itemText = itemMatch[2].trim();
        const cNum = judgmentAnswerNum * 100 + (KATAKANA_LABELS.indexOf(label) + 1);
        const hasNegation = itemText.includes("該当しない") || itemText.includes("対象外");
        const isCorrect = !hasNegation && (itemText.includes("該当") || itemText.includes("対象"));
        let sourceReference = "";
        const srcMatch = itemText.match(/(?:該当(?:する|しない)[。．.]?|対象外?取引|適用対象外?)\s*(.*)/);
        if (srcMatch && srcMatch[1]) {
          sourceReference = srcMatch[1].trim();
        }
        currentA = {
          num: cNum,
          isCorrect,
          lines: [],
          sourceReference,
        };
        collectingAdditional = false;
        continue;
      }
    }

    // In answer mode — check for combo sub-item (ア × / ウ．○)
    if (mode === "answer" && comboProblemNum != null) {
      const comboMatch = line.match(COMBO_ITEM_RE);
      if (comboMatch) {
        flushAnswer();
        const label = comboMatch[1];
        const marubatsu = comboMatch[2];
        const explanationText = comboMatch[3].trim();
        const cNum = comboProblemNum * 100 + (KATAKANA_LABELS.indexOf(label) + 1);
        currentA = {
          num: cNum,
          isCorrect: marubatsu === "○",
          lines: explanationText ? [explanationText] : [],
          sourceReference: "",
        };
        collectingAdditional = false;
        continue;
      }
      // Combo item without ○/× (正解ア format) — use comboCorrectLabels
      if (comboCorrectLabels.size > 0) {
        const itemMatch = line.match(ITEM_LABEL_RE);
        if (itemMatch) {
          flushAnswer();
          const label = itemMatch[1];
          const explanationText = itemMatch[2].trim();
          const cNum = comboProblemNum * 100 + (KATAKANA_LABELS.indexOf(label) + 1);
          currentA = {
            num: cNum,
            isCorrect: comboCorrectLabels.has(label),
            lines: explanationText ? [explanationText] : [],
            sourceReference: "",
          };
          collectingAdditional = false;
          continue;
        }
      }
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

    // In question mode — check for judgment question sub-item (ア～ケ)
    if (mode === "question" && currentQ) {
      const itemMatch = line.match(ITEM_LABEL_RE);
      if (itemMatch) {
        isJudgmentQuestion = true;
        buffer = []; // discard intro text (use item text only)
        const label = itemMatch[1];
        const itemText = itemMatch[2].trim();
        const cNum = currentQ.num! * 100 + (KATAKANA_LABELS.indexOf(label) + 1);
        questions.push({
          num: cNum,
          session: currentQ.session || currentSession,
          text: itemText,
          difficulty: currentQ.difficulty || 2,
          year: currentQ.year ?? null,
        });
        continue;
      }
    }

    // In question mode — check for section header
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch && !line.includes("問題") && !line.includes("重要度") && !isJudgmentQuestion) {
      flushQuestion();
      currentSession = sectionMatch[2].trim();
      continue;
    }

    // Regular text line — append to question buffer (skip in judgment/combo questions)
    if (currentQ && !isJudgmentQuestion) {
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
