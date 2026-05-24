import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { weightedSelect } from "@/lib/weighted-shuffle";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const subjectId = sp.get("subjectId");
  const topicId = sp.get("topicId");
  const sessionId = sp.get("sessionId");
  const difficulty = sp.get("difficulty");
  const mode = sp.get("mode") || "all";
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

  const where: Record<string, unknown> = {};
  if (subjectId && !topicId) {
    where.topic = { subjectId: Number(subjectId) };
  }
  if (topicId) where.topicId = Number(topicId);
  if (sessionId) where.sessionId = Number(sessionId);
  if (difficulty) where.difficulty = Number(difficulty);

  if (mode === "unanswered") {
    where.answerHistories = { none: {} };
  } else if (mode === "bookmarked") {
    where.bookmarks = { some: {} };
  } else if (mode === "wrong") {
    const wrongQuestionIds = await prisma.answerHistory.groupBy({
      by: ["questionId"],
      having: {
        isCorrect: { _min: { equals: false } },
      },
    });
    const allAnswered = await prisma.answerHistory.findMany({
      select: { questionId: true, isCorrect: true },
      orderBy: { answeredAt: "desc" },
    });
    const lastAnswerMap = new Map<number, boolean>();
    for (const a of allAnswered) {
      if (!lastAnswerMap.has(a.questionId)) {
        lastAnswerMap.set(a.questionId, a.isCorrect);
      }
    }
    const wrongIds = wrongQuestionIds
      .map((g) => g.questionId)
      .filter((id) => lastAnswerMap.get(id) === false);
    if (wrongIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0 });
    }
    where.id = { in: wrongIds };
  } else if (mode === "weak") {
    const threshold = Math.min(100, Math.max(0, Number(sp.get("accuracy") || 50)));

    // Count total and correct per question (min 2 answers)
    const [totalCounts, correctCounts] = await Promise.all([
      prisma.answerHistory.groupBy({
        by: ["questionId"],
        _count: true,
      }),
      prisma.answerHistory.groupBy({
        by: ["questionId"],
        where: { isCorrect: true },
        _count: true,
      }),
    ]);

    const correctMap = new Map(correctCounts.map((c) => [c.questionId, c._count]));
    const weakIds = totalCounts
      .filter((t) => {
        if (t._count < 2) return false;
        const correct = correctMap.get(t.questionId) ?? 0;
        const accuracy = Math.round((correct / t._count) * 100);
        return accuracy <= threshold;
      })
      .map((t) => t.questionId);

    if (weakIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0 });
    }
    where.id = { in: weakIds };
  } else if (mode === "weakTopic") {
    const threshold = Math.min(100, Math.max(0, Number(sp.get("accuracy") || 50)));

    // Count total and correct per question
    const [totalCounts, correctCounts] = await Promise.all([
      prisma.answerHistory.groupBy({
        by: ["questionId"],
        _count: true,
      }),
      prisma.answerHistory.groupBy({
        by: ["questionId"],
        where: { isCorrect: true },
        _count: true,
      }),
    ]);

    // Map questions to topics
    const questionIds = totalCounts.map((t) => t.questionId);
    const questionsWithTopic = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, topicId: true },
    });
    const questionTopicMap = new Map(questionsWithTopic.map((q) => [q.id, q.topicId]));

    // Aggregate accuracy by topic
    const correctMap = new Map(correctCounts.map((c) => [c.questionId, c._count]));
    const topicAgg = new Map<number, { total: number; correct: number }>();
    for (const t of totalCounts) {
      const tid = questionTopicMap.get(t.questionId);
      if (tid == null) continue;
      const agg = topicAgg.get(tid) || { total: 0, correct: 0 };
      agg.total += t._count;
      agg.correct += (correctMap.get(t.questionId) ?? 0);
      topicAgg.set(tid, agg);
    }

    // Find weak topics (>= 5 answers, accuracy <= threshold)
    const weakTopicIds = Array.from(topicAgg.entries())
      .filter(([, agg]) => {
        if (agg.total < 5) return false;
        const acc = Math.round((agg.correct / agg.total) * 100);
        return acc <= threshold;
      })
      .map(([id]) => id);

    if (weakTopicIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0 });
    }
    where.topicId = { in: weakTopicIds };
  } else if (mode === "review") {
    where.nextReviewAt = { lte: new Date() };
  }

  const total = await prisma.question.count({ where });

  // Phase 1: lightweight query for weighted selection
  const pool = await prisma.question.findMany({
    where,
    select: { id: true, difficulty: true },
  });

  // Phase 2: weighted random selection (skip if difficulty filter is set)
  const selectedIds = difficulty
    ? pool
        .map((q) => ({ id: q.id, _sort: Math.random() }))
        .sort((a, b) => a._sort - b._sort)
        .slice(0, limit)
        .map((q) => q.id)
    : weightedSelect(pool, limit);

  if (selectedIds.length === 0) {
    return NextResponse.json({ questions: [], total });
  }

  // Phase 3: fetch full data for selected IDs
  const questions = await prisma.question.findMany({
    where: { id: { in: selectedIds } },
    include: {
      topic: { select: { id: true, name: true } },
      session: { select: { id: true, name: true } },
      choices: { orderBy: { displayOrder: "asc" } },
      bookmarks: { select: { id: true } },
      answerHistories: {
        orderBy: { answeredAt: "desc" },
        take: 5,
        select: { isCorrect: true },
      },
    },
  });

  // Maintain weighted order from Phase 2
  const orderMap = new Map(selectedIds.map((id, i) => [id, i]));
  questions.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return NextResponse.json({ questions, total });
}
