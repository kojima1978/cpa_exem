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

async function getHomeData() {
  const today = new Date().toISOString().slice(0, 10);

  const [subjects, todayStreak, allStreaks, totalQuestions, totalAnswered, totalCorrect] =
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
    ]);

  const reviewCount = await getReviewCount();

  const subjectCounts = subjects.map((s) => ({
    name: s.name,
    count: s.topics.reduce((sum, t) => sum + t._count.questions, 0),
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

async function getReviewCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const questions = await prisma.question.findMany({
    include: {
      answerHistories: {
        orderBy: { answeredAt: "desc" },
        select: { isCorrect: true, answeredAt: true },
      },
    },
  });

  let count = 0;
  for (const q of questions) {
    if (q.answerHistories.length === 0) {
      count++;
      continue;
    }
    const answers = q.answerHistories.map((h) => h.isCorrect);
    let ef = 2.5;
    let interval = 1;
    let cc = 0;
    for (const ok of [...answers].reverse()) {
      if (ok) {
        cc++;
        interval = cc === 1 ? 1 : cc === 2 ? 6 : Math.round(interval * ef);
        ef = Math.max(1.3, ef + 0.1);
      } else {
        cc = 0;
        interval = 1;
        ef = Math.max(1.3, ef - 0.2);
      }
    }
    const last = new Date(q.answerHistories[0].answeredAt);
    const next = new Date(last.getTime() + interval * 86400000);
    if (next <= today) count++;
  }
  return count;
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
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
          {data.subjectCounts.map((subject) => (
            <div
              key={subject.name}
              className={`rounded-lg border p-4 ${
                subject.active
                  ? "border-primary-200 bg-primary-50"
                  : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="font-medium">{subject.name}</div>
              <div className="mt-1 text-sm text-gray-500">
                問題数: {subject.count}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
