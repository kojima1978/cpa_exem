"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

type DbStats = {
  questionCount: number;
  topicCount: number;
  fileSize: number;
  lastModified: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchStats = useCallback(() => {
    fetch("/api/backup/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(fetchStats, [fetchStats]);

  const handleRestore = async () => {
    if (!file) return;

    const confirmed = window.confirm(
      "復元すると現在のデータが上書きされます。\n復元前に自動バックアップが作成されます。\n\nよろしいですか？",
    );
    if (!confirmed) return;

    setRestoring(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", message: data.message });
        setFile(null);
        fetchStats();
      } else {
        setResult({ type: "error", message: data.error });
      }
    } catch {
      setResult({ type: "error", message: "復元中にエラーが発生しました" });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">設定</h1>

      {/* Backup section */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary-500" />
          <h2 className="font-bold">バックアップ</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          データベースファイルをダウンロードして保存できます
        </p>

        {stats && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-lg font-bold text-primary-600">
                {stats.questionCount}
              </div>
              <div className="text-xs text-gray-500">問題数</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-lg font-bold text-primary-600">
                {stats.topicCount}
              </div>
              <div className="text-xs text-gray-500">分野数</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-lg font-bold text-primary-600">
                {formatSize(stats.fileSize)}
              </div>
              <div className="text-xs text-gray-500">ファイルサイズ</div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/backup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Download className="h-4 w-4" />
            DBバックアップ
          </a>
          <a
            href="/api/export"
            className="inline-flex items-center gap-2 rounded-lg border border-primary-500 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"
          >
            <Download className="h-4 w-4" />
            JSONエクスポート
          </a>
        </div>
      </div>

      {/* Restore section */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-amber-500" />
          <h2 className="font-bold">復元</h2>
        </div>

        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">注意</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>・復元すると現在のデータが上書きされます</li>
                <li>・復元前に自動でバックアップが作成されます</li>
                <li>・SQLiteファイル（.db）のみ対応しています</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            {file ? file.name : "ファイルを選択"}
            <input
              type="file"
              accept=".db"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
              }}
            />
          </label>
          <button
            onClick={handleRestore}
            disabled={!file || restoring}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {restoring ? "復元中..." : "復元を実行"}
          </button>
        </div>

        {result && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
              result.type === "success"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
