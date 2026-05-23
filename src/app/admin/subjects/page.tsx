"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { SubjectData } from "@/types";

type SubjectWithCount = SubjectData & {
  _count?: { topics: number; sessions: number };
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const fetchSubjects = useCallback(async () => {
    const res = await fetch("/api/subjects");
    setSubjects(await res.json());
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    fetchSubjects();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/subjects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchSubjects();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この科目を削除しますか？")) return;
    const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "削除に失敗しました");
      return;
    }
    fetchSubjects();
  };

  return (
    <div>
      <h1 className="text-xl font-bold">科目管理</h1>

      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新しい科目名（例: 管理会計論）"
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          追加
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm"
          >
            {editingId === subject.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(subject.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button
                  onClick={() => handleUpdate(subject.id)}
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
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">
                  {subject.name}
                </span>
                <span className="text-xs text-gray-400">
                  {subject._count?.topics ?? 0} 分野 / {subject._count?.sessions ?? 0} 学習単位
                </span>
                <button
                  onClick={() => {
                    setEditingId(subject.id);
                    setEditName(subject.name);
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-500"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(subject.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="py-8 text-center text-gray-400">科目がありません</p>
        )}
      </div>
    </div>
  );
}
