"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import type { QuestionWithRelations, TopicData, SessionData } from "@/types";

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithRelations[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [topicId, setTopicId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [search, setSearch] = useState("");

  const fetchQuestions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (topicId) params.set("topicId", topicId);
    if (sessionId) params.set("sessionId", sessionId);
    if (search) params.set("search", search);

    const res = await fetch(`/api/questions?${params}`);
    const data = await res.json();
    setQuestions(data.questions);
    setTotal(data.pagination.total);
    setTotalPages(data.pagination.totalPages);
  }, [page, topicId, sessionId, search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics);
    fetch("/api/sessions").then((r) => r.json()).then(setSessions);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("この問題を削除しますか？")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    fetchQuestions();
  };

  const difficultyLabel = (d: number) =>
    ["", "易", "標準", "難"][d] || "";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">問題一覧</h1>
        <Link
          href="/admin/questions/new"
          className="flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          新規作成
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="問題文を検索..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="rounded-lg border py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={topicId}
          onChange={(e) => { setTopicId(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">全分野</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={sessionId}
          onChange={(e) => { setSessionId(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">全学習単位</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-sm text-gray-500">{total} 件</p>

      <div className="mt-2 space-y-2">
        {questions.map((q) => (
          <div
            key={q.id}
            className="flex items-start gap-3 rounded-lg border bg-white p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium">{q.text}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded bg-primary-50 px-2 py-0.5 text-primary-700">
                  {q.topic.name}
                </span>
                {q.session && (
                  <span className="rounded bg-gray-100 px-2 py-0.5">
                    {q.session.name}
                  </span>
                )}
                <span>難易度: {difficultyLabel(q.difficulty)}</span>
                {q.year && <span>{q.year}年</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Link
                href={`/admin/questions/${q.id}/edit`}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-500"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(q.id)}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <p className="py-8 text-center text-gray-400">
            問題がありません
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
