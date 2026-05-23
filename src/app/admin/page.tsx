"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Upload,
  FolderTree,
  BookMarked,
  Settings,
  Library,
  BarChart3,
} from "lucide-react";

const CARDS = [
  {
    href: "/admin/questions",
    label: "問題一覧",
    desc: "登録済みの問題を閲覧・編集",
    icon: FileText,
  },
  {
    href: "/admin/import",
    label: "インポート",
    desc: "JSON/CSVで問題を一括登録",
    icon: Upload,
  },
  {
    href: "/admin/subjects",
    label: "科目管理",
    desc: "財務会計論・会社法など科目の追加・編集",
    icon: Library,
  },
  {
    href: "/admin/topics",
    label: "分野管理",
    desc: "問題の分野を追加・編集",
    icon: FolderTree,
  },
  {
    href: "/admin/sessions",
    label: "学習単位管理",
    desc: "基準・単元の追加・編集",
    icon: BookMarked,
  },
  {
    href: "/admin/settings",
    label: "設定",
    desc: "バックアップ・復元",
    icon: Settings,
  },
];

type SubjectStat = {
  id: number;
  name: string;
  questionCount: number;
  topicCount: number;
  sessionCount: number;
  answeredQuestions: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number | null;
};

export default function AdminPage() {
  const [stats, setStats] = useState<SubjectStat[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const totalQuestions = stats.reduce((s, x) => s + x.questionCount, 0);
  const totalTopics = stats.reduce((s, x) => s + x.topicCount, 0);
  const totalSessions = stats.reduce((s, x) => s + x.sessionCount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">管理画面</h1>

      {/* Dashboard summary */}
      {stats.length > 0 && (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            科目別サマリー
          </h2>

          {/* Totals row */}
          <div className="mt-3 flex gap-6 text-sm text-gray-500">
            <span>全問題: <strong className="text-gray-800">{totalQuestions}</strong></span>
            <span>全分野: <strong className="text-gray-800">{totalTopics}</strong></span>
            <span>全学習単位: <strong className="text-gray-800">{totalSessions}</strong></span>
          </div>

          {/* Per-subject cards */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {stats.map((s) => {
              const progress = s.questionCount > 0
                ? Math.round((s.answeredQuestions / s.questionCount) * 100)
                : 0;
              return (
                <div
                  key={s.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    {s.accuracy !== null && (
                      <span className="text-sm font-medium text-primary-600">
                        正答率 {s.accuracy}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span>問題: {s.questionCount}</span>
                    <span>分野: {s.topicCount}</span>
                    <span>学習単位: {s.sessionCount}</span>
                    <span>回答済: {s.answeredQuestions}/{s.questionCount}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-primary-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Navigation cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">{label}</div>
              <div className="mt-0.5 text-sm text-gray-500">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
