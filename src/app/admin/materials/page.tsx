"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import type { MaterialData } from "@/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = useCallback(() => {
    fetch("/api/materials")
      .then((r) => r.json())
      .then(setMaterials)
      .catch(() => setMaterials([]));
  }, []);

  useEffect(fetchMaterials, [fetchMaterials]);

  const selectFile = (selected: File | null) => {
    if (inputRef.current) inputRef.current.value = "";
    setMessage(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setMessage("PDFファイルを選択してください");
      return;
    }
    setFile(selected);
    if (!title.trim()) setTitle(selected.name.replace(/\.pdf$/i, ""));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);

    const res = await fetch("/api/materials", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (res.ok) {
      setFile(null);
      setTitle("");
      setMessage("資料PDFをアップロードしました");
      fetchMaterials();
    } else {
      setMessage(data.error || "アップロードに失敗しました");
    }
    setUploading(false);
  };

  const handleDelete = async (material: MaterialData) => {
    if (!confirm(`${material.title} を削除しますか？`)) return;
    await fetch(`/api/materials/${material.id}`, { method: "DELETE" });
    fetchMaterials();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">資料PDF</h1>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary-500" />
          <h2 className="font-bold">PDFアップロード</h2>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? "border-primary-500 bg-primary-50"
                : "border-gray-300 hover:border-primary-400 hover:bg-primary-50/40"
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              selectFile(e.dataTransfer.files?.[0] || null);
            }}
          >
            <FileText className="h-8 w-8 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">
              {file ? file.name : "PDFをドラッグ＆ドロップ"}
            </span>
            <span className="text-xs text-gray-500">
              クリックしてファイルを選択することもできます
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                資料名
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="例: 相続税法 理論資料"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {uploading ? "アップロード中..." : "アップロード"}
            </button>
            {message && (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">登録済みPDF</h2>
        <div className="mt-3 space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <FileText className="h-5 w-5 shrink-0 text-primary-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{material.title}</p>
                <p className="text-xs text-gray-500">
                  {material.originalName} / {formatSize(material.size)} / 紐づけ{" "}
                  {material._count?.questions ?? 0}問
                </p>
              </div>
              <a
                href={`/api/materials/${material.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-500"
                title="PDFを開く"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={() => handleDelete(material)}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {materials.length === 0 && (
            <p className="py-8 text-center text-gray-400">
              資料PDFがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
