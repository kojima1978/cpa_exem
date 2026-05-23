import Link from "next/link";
import {
  BookOpen,
  PlayCircle,
  GraduationCap,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calculateStreak } from "@/lib/streak";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const today = new Date().toISOString().slice(0, 10);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const [subjects, todayStreak, allStreaks, totalQuestions, totalAnswered, totalCorrect, reviewCount] =
    await Promise.all([
      prisma.subject.findMany({
        orderBy: { displayOrder: "asc" },
        include: { topics: { include: { _count: { select: { questions: true } } } } },
      }),
      prisma.studyStreak.findUnique({ where: { date: today } }),
      prisma.studyStreak.findMany({ orderBy: { date: "desc" } }),
      prisma.question.count(),
      prisma.answerHistory.count(),
      prisma.answerHistory.count({ where: { isCorrect: true } }),
      prisma.question.count({
        where: { OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: todayDate } }] },
      }),
    ]);

  const answeredByTopic = await prisma.question.groupBy({
    by: ["topicId"],
    where: { answerHistories: { some: {} } },
    _count: true,
  });
  const answeredMap = new Map(answeredByTopic.map((g) => [g.topicId, g._count]));

  const subjectCounts = subjects.map((s) => ({
    name: s.name,
    count: s.topics.reduce((sum, t) => sum + t._count.questions, 0),
    answered: s.topics.reduce((sum, t) => sum + (answeredMap.get(t.id) || 0), 0),
    active: s.topics.some((t) => t._count.questions > 0),
  }));

  const streak = calculateStreak(allStreaks.map((s) => s.date));

  return {
    subjectCounts,
    todayStats: {
      questionCount: todayStreak?.questionCount ?? 0,
      correctCount: todayStreak?.correctCount ?? 0,
    },
    streak,
    totalQuestions,
    totalAnswered,
    overallAccuracy:
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    reviewCount,
  };
}

export default async function HomePage() {
  const data = await getHomeData();

  const todayAccuracy =
    data.todayStats.questionCount > 0
      ? Math.round(
          (data.todayStats.correctCount / data.todayStats.questionCount) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-2xl font-bold text-primary-700">CPA短答ドリル</h1>
        <p className="mt-1 text-sm text-gray-500">
          公認会計士試験 短答式問題を隙間時間で演習
        </p>
      </section>

      {/* Streak + Today stats */}
      <div className="grid gap-3 grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
          <Flame className="mx-auto h-6 w-6 text-orange-500" />
          <div className="mt-1 text-2xl font-bold text-orange-500">
            {data.streak}
          </div>
          <div className="text-xs text-gray-500">連続日数</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
          <Target className="mx-auto h-6 w-6 text-primary-500" />
          <div className="mt-1 text-2xl font-bold text-primary-500">
            {data.todayStats.questionCount}
          </div>
          <div className="text-xs text-gray-500">今日の問題数</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
          <TrendingUp className="mx-auto h-6 w-6 text-green-500" />
          <div className="mt-1 text-2xl font-bold text-green-500">
            {todayAccuracy}%
          </div>
          <div className="text-xs text-gray-500">今日の正答率</div>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/practice"
          className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
            <PlayCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">クイック演習</h2>
            <p className="text-sm text-gray-500">今すぐ問題を解く</p>
          </div>
        </Link>

        <Link
          href="/practice?mode=review"
          className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">復習する</h2>
            <p className="text-sm text-gray-500">
              {data.reviewCount > 0
                ? `${data.reviewCount}問が復習対象`
                : "復習対象なし"}
            </p>
          </div>
        </Link>
      </div>

      {/* Overall stats */}
      {data.totalAnswered > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-400">累計</h2>
          <div className="mt-2 flex gap-6 text-sm">
            <span>
              総回答数: <strong>{data.totalAnswered}</strong>
            </span>
            <span>
              正答率: <strong>{data.overallAccuracy}%</strong>
            </span>
            <span>
              登録問題: <strong>{data.totalQuestions}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Subjects */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap className="h-5 w-5 text-primary-500" />
          科目
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.subjectCounts.map((subject) => {
            const progress = subject.count > 0
              ? Math.round((subject.answered / subject.count) * 100)
              : 0;
            return subject.active ? (
              <Link
                key={subject.name}
                href="/practice"
                className="block rounded-lg border border-primary-200 bg-primary-50 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{subject.name}</span>
                  <PlayCircle className="h-4 w-4 text-primary-400" />
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {subject.answered}/{subject.count}問 回答済み
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-primary-100">
                  <div
                    className="h-1.5 rounded-full bg-primary-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </Link>
            ) : (
              <div
                key={subject.name}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60"
              >
                <div className="font-medium">{subject.name}</div>
                <div className="mt-1 text-sm text-gray-500">
                  問題数: {subject.count}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
