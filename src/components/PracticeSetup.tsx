"use client";

import { useState, useEffect } from "react";
import { PlayCircle, Filter } from "lucide-react";
import type { TopicData, SessionData } from "@/types";

type Props = {
  onStart: (params: URLSearchParams) => void;
  initialMode: string;
};

const MODES = [
  { value: "all", label: "全問" },
  { value: "session", label: "学習単位指定" },
  { value: "bookmarked", label: "ブックマークのみ" },
  { value: "wrong", label: "間違えた問題" },
  { value: "review", label: "要復習（間隔反復）" },
];

export function PracticeSetup({ onStart, initialMode }: Props) {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [mode, setMode] = useState(initialMode);
  const [topicId, setTopicId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [limit, setLimit] = useState("20");

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics);
    fetch("/api/sessions").then((r) => r.json()).then(setSessions);
  }, []);

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("limit", limit);
    if (topicId) params.set("topicId", topicId);
    if (mode === "session" && sessionId) params.set("sessionId", sessionId);
    if (difficulty) params.set("difficulty", difficulty);
    onStart(params);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">演習設定</h1>

      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Filter className="mr-1 inline h-4 w-4" />
            出題モード
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === m.value
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "session" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学習単位
            </label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s._count?.questions ?? 0}問)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分野
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">全分野</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              難易度
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">全て</option>
              <option value="1">易</option>
              <option value="2">標準</option>
              <option value="3">難</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              問題数
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="10">10問</option>
              <option value="20">20問</option>
              <option value="30">30問</option>
              <option value="50">50問</option>
              <option value="100">100問</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-bold text-white hover:bg-primary-600 sm:w-auto"
        >
          <PlayCircle className="h-5 w-5" />
          演習を開始
        </button>
      </div>
    </div>
  );
}
