"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { SessionData } from "@/types";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    setSessions(await res.json());
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: 1,
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

  return (
    <div>
      <h1 className="text-xl font-bold">学習単位管理</h1>

      <form onSubmit={handleCreate} className="mt-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="学習単位名（例: 企業会計原則）"
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
            学習単位がありません
          </p>
        )}
      </div>
    </div>
  );
}
