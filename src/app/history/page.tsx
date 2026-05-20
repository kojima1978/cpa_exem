"use client";

import { useState, useEffect } from "react";
import {
  Flame,
  Trophy,
  Calendar,
  BarChart3,
  TrendingUp,
} from "lucide-react";

type DailyStat = {
  date: string;
  questionCount: number;
  correctCount: number;
  accuracy: number;
};

type TopicStat = {
  id: number;
  name: string;
  questionCount: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number | null;
};

type StatsData = {
  totalQuestions: number;
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
  streak: { current: number; longest: number };
};

export default function HistoryPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
    fetch("/api/stats/daily?days=30").then((r) => r.json()).then(setDaily);
    fetch("/api/stats/topics").then((r) => r.json()).then(setTopicStats);
  }, []);

  if (!stats) {
    return <p className="py-12 text-center text-gray-400">読み込み中...</p>;
  }

  const answeredTopics = topicStats.filter((t) => t.totalAnswered > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">学習履歴</h1>

      {/* Streak cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
          <Flame className="mx-auto h-5 w-5 text-orange-500" />
          <div className="mt-1 text-2xl font-bold text-orange-500">
            {stats.streak.current}
          </div>
          <div className="text-xs text-gray-500">連続学習日数</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
          <Trophy className="mx-auto h-5 w-5 text-yellow-500" />
          <div className="mt-1 text-2xl font-bold text-yellow-500">
            {stats.streak.longest}
          </div>
          <div className="text-xs text-gray-500">最長記録</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
          <Calendar className="mx-auto h-5 w-5 text-primary-500" />
          <div className="mt-1 text-2xl font-bold text-primary-500">
            {stats.totalAnswered}
          </div>
          <div className="text-xs text-gray-500">累計回答数</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-green-500" />
          <div className="mt-1 text-2xl font-bold text-green-500">
            {stats.overallAccuracy}%
          </div>
          <div className="text-xs text-gray-500">累計正答率</div>
        </div>
      </div>

      {/* Topic accuracy */}
      {answeredTopics.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            分野別正答率
          </h2>
          <div className="mt-4 space-y-3">
            {answeredTopics.map((topic) => (
              <div key={topic.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{topic.name}</span>
                  <span className="text-gray-500">
                    {topic.totalCorrect}/{topic.totalAnswered} (
                    {topic.accuracy ?? 0}%)
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-gray-200">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      (topic.accuracy ?? 0) >= 80
                        ? "bg-green-500"
                        : (topic.accuracy ?? 0) >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${topic.accuracy ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily history */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold">
          <Calendar className="h-5 w-5 text-primary-500" />
          日別学習記録（直近30日）
        </h2>
        {daily.length > 0 ? (
          <div className="mt-4">
            {/* Visual bar chart */}
            <div className="flex items-end gap-1 h-24 mb-4">
              {daily
                .slice()
                .reverse()
                .map((d) => {
                  const maxCount = Math.max(...daily.map((x) => x.questionCount), 1);
                  const height = (d.questionCount / maxCount) * 100;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 rounded-t group relative"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    >
                      <div
                        className={`w-full h-full rounded-t ${
                          d.accuracy >= 80
                            ? "bg-green-400"
                            : d.accuracy >= 50
                              ? "bg-yellow-400"
                              : d.questionCount > 0
                                ? "bg-red-400"
                                : "bg-gray-200"
                        }`}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white z-10">
                        {d.date.slice(5)}: {d.questionCount}問 {d.accuracy}%
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-400">
                    <th className="pb-2 pr-4">日付</th>
                    <th className="pb-2 pr-4 text-right">問題数</th>
                    <th className="pb-2 pr-4 text-right">正解数</th>
                    <th className="pb-2 text-right">正答率</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.date} className="border-b last:border-0">
                      <td className="py-2 pr-4">{d.date}</td>
                      <td className="py-2 pr-4 text-right">
                        {d.questionCount}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {d.correctCount}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`font-medium ${
                            d.accuracy >= 80
                              ? "text-green-600"
                              : d.accuracy >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {d.accuracy}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-center text-gray-400">まだ学習記録がありません</p>
        )}
      </div>
    </div>
  );
}
