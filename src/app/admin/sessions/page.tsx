"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { SessionData, SubjectData } from "@/types";

export default function SessionsPage() {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data: SubjectData[]) => {
        setSubjects(data);
        if (data.length > 0 && subjectId === 0) setSubjectId(data[0].id);
      });
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!subjectId) return;
    const res = await fetch(`/api/sessions?subjectId=${subjectId}`);
    setSessions(await res.json());
  }, [subjectId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !subjectId) return;
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        name: newName.trim(),
        description: newDesc.trim(),
      }),
    });
    setNewName("");
    setNewDesc("");
    fetchSessions();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDesc.trim(),
      }),
    });
    setEditingId(null);
    fetchSessions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この学習単位を削除しますか？")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    fetchSessions();
  };

  const currentSubject = subjects.find((s) => s.id === subjectId);

  return (
    <div>
      <h1 className="text-xl font-bold">学習単位管理</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubjectId(s.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              subjectId === s.id
                ? "bg-primary-500 text-white"
                : "border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {currentSubject && (
        <>
          <form onSubmit={handleCreate} className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`${currentSubject.name} の学習単位名（例: 企業会計原則）`}
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                <Plus className="h-4 w-4" />
                追加
              </button>
            </div>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="説明（任意）"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </form>

          <div className="mt-4 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-lg border bg-white p-3 shadow-sm"
              >
                {editingId === session.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(session.id)}
                        className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="説明"
                      className="w-full rounded-lg border px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{session.name}</div>
                      {session.description && (
                        <div className="text-xs text-gray-500">
                          {session.description}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {session._count?.questions ?? 0} 問
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(session.id);
                        setEditName(session.name);
                        setEditDesc(session.description);
                      }}
                      className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-500"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="py-8 text-center text-gray-400">
                {currentSubject.name} の学習単位がありません
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
