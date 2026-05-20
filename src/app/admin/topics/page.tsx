"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { TopicData } from "@/types";

export default function TopicsPage() {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const fetchTopics = useCallback(async () => {
    const res = await fetch("/api/topics");
    setTopics(await res.json());
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: 1, name: newName.trim() }),
    });
    setNewName("");
    fetchTopics();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/topics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchTopics();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この分野を削除しますか？")) return;
    await fetch(`/api/topics/${id}`, { method: "DELETE" });
    fetchTopics();
  };

  return (
    <div>
      <h1 className="text-xl font-bold">分野管理</h1>

      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新しい分野名..."
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
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm"
          >
            {editingId === topic.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(topic.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button
                  onClick={() => handleUpdate(topic.id)}
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
                  {topic.name}
                </span>
                <span className="text-xs text-gray-400">
                  {topic._count?.questions ?? 0} 問
                </span>
                <button
                  onClick={() => {
                    setEditingId(topic.id);
                    setEditName(topic.name);
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-500"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(topic.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ))}
        {topics.length === 0 && (
          <p className="py-8 text-center text-gray-400">分野がありません</p>
        )}
      </div>
    </div>
  );
}
