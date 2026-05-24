"use client";

import { useState, useEffect } from "react";
import { PlayCircle, Filter, BarChart3 } from "lucide-react";
import type { TopicData, SessionData, SubjectData } from "@/types";

type TopicAccuracy = {
  topicId: number;
  topicName: string;
  subjectName: string;
  total: number;
  correct: number;
  accuracy: number;
};

type ModeCounts = {
  all: number;
  unanswered: number;
  bookmarked: number;
  wrong: number;
  weak: number;
  review: number;
};

type Props = {
  onStart: (params: URLSearchParams) => void;
  initialMode: string;
};

const MODES = [
  { value: "all", label: "全問", countKey: "all" as const },
  { value: "unanswered", label: "未回答のみ", countKey: "unanswered" as const },
  { value: "session", label: "学習単位指定", countKey: null },
  { value: "bookmarked", label: "ブックマーク", countKey: "bookmarked" as const },
  { value: "wrong", label: "間違えた問題", countKey: "wrong" as const },
  { value: "weak", label: "苦手問題", countKey: "weak" as const },
  { value: "weakTopic", label: "苦手分野", countKey: null },
  { value: "review", label: "要復習", countKey: "review" as const },
];

export function PracticeSetup({ onStart, initialMode }: Props) {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [mode, setMode] = useState(initialMode);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [accuracy, setAccuracy] = useState("50");
  const [limit, setLimit] = useState("20");
  const [topicAccuracies, setTopicAccuracies] = useState<TopicAccuracy[]>([]);
  const [counts, setCounts] = useState<ModeCounts | null>(null);

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
    fetch("/api/topics").then((r) => r.json()).then(setTopics);
    fetch("/api/sessions").then((r) => r.json()).then(setSessions);
  }, []);

  // フィルタ変更時にモード別件数を取得
  useEffect(() => {
    const params = new URLSearchParams();
    if (subjectId) params.set("subjectId", subjectId);
    if (topicId) params.set("topicId", topicId);
    if (difficulty) params.set("difficulty", difficulty);
    fetch(`/api/practice/counts?${params.toString()}`)
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, [subjectId, topicId, difficulty]);

  // 科目選択時に分野・学習単位をフィルタ
  const filteredTopics = subjectId
    ? topics.filter((t) => t.subjectId === Number(subjectId))
    : topics;
  const filteredSessions = subjectId
    ? sessions.filter((s) => s.subjectId === Number(subjectId))
    : sessions;

  // 科目変更時に分野・学習単位の選択をリセット
  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    setTopicId("");
    setSessionId("");
  };

  useEffect(() => {
    if (mode === "weakTopic") {
      fetch("/api/topics/accuracy").then((r) => r.json()).then(setTopicAccuracies);
    }
  }, [mode]);

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("limit", limit);
    if (subjectId) params.set("subjectId", subjectId);
    if (topicId) params.set("topicId", topicId);
    if (sessionId) params.set("sessionId", sessionId);
    if (difficulty) params.set("difficulty", difficulty);
    if (mode === "weak" || mode === "weakTopic") params.set("accuracy", accuracy);
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
            {MODES.map((m) => {
              const count = m.countKey && counts ? counts[m.countKey] : null;
              const disabled = count === 0;
              return (
                <button
                  key={m.value}
                  onClick={() => !disabled && setMode(m.value)}
                  disabled={disabled}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    disabled
                      ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                      : mode === m.value
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m.label}
                  {count != null && (
                    <span className={`ml-1 text-xs ${disabled ? "text-gray-300" : "text-gray-400"}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {mode === "weak" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              正答率の閾値
            </label>
            <select
              value={accuracy}
              onChange={(e) => setAccuracy(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="50">50%以下（苦手）</option>
              <option value="70">70%以下（まだ不安）</option>
              <option value="90">90%以下（ほぼ全問）</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">2回以上回答した問題が対象</p>
          </div>
        )}

        {mode === "weakTopic" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                正答率の閾値
              </label>
              <select
                value={accuracy}
                onChange={(e) => setAccuracy(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="50">50%以下（苦手）</option>
                <option value="70">70%以下（まだ不安）</option>
                <option value="90">90%以下（ほぼ全問）</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">5回以上回答がある分野が対象</p>
            </div>

            {topicAccuracies.length > 0 && (
              <div className="rounded-lg border bg-gray-50 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary-500" />
                  分野別正答率
                </h3>
                <div className="space-y-2.5">
                  {topicAccuracies.map((ta) => {
                    const isWeak = ta.accuracy <= Number(accuracy);
                    return (
                      <div key={ta.topicId}>
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${isWeak ? "text-red-700" : "text-gray-600"}`}>
                            {ta.topicName}
                          </span>
                          <span className={`text-xs ${isWeak ? "text-red-500 font-bold" : "text-gray-400"}`}>
                            {ta.accuracy}% ({ta.correct}/{ta.total})
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              isWeak ? "bg-red-500" : "bg-green-500"
                            }`}
                            style={{ width: `${ta.accuracy}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  対象:{" "}
                  <span className="font-bold text-red-600">
                    {topicAccuracies.filter((ta) => ta.accuracy <= Number(accuracy)).length}分野
                  </span>{" "}
                  / 全{topicAccuracies.length}分野
                </p>
              </div>
            )}
          </div>
        )}

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
              {filteredSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s._count?.questions ?? 0}問)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              科目
            </label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">全科目</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
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
              {subjectId ? (
                filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              ) : (
                subjects.map((s) => {
                  const subjectTopics = topics.filter((t) => t.subjectId === s.id);
                  if (subjectTopics.length === 0) return null;
                  return (
                    <optgroup key={s.id} label={s.name}>
                      {subjectTopics.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  );
                })
              )}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              出題頻度
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">全て</option>
              <option value="1">出題高</option>
              <option value="2">普通</option>
              <option value="3">出題低</option>
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
