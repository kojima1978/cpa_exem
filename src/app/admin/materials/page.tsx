"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { getFileDisplayPath, PdfDropZone } from "@/components/PdfDropZone";
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
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [replaceDraggingId, setReplaceDraggingId] = useState<number | null>(null);
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

  const handleReplace = async (material: MaterialData, selected: File | null) => {
    setMessage(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setMessage("PDFファイルを選択してください");
      return;
    }

    setReplacingId(material.id);
    const formData = new FormData();
    formData.append("file", selected);
    formData.append("title", material.title);

    try {
      const res = await fetch(`/api/materials/${material.id}`, {
        method: "PATCH",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(`${material.title} のPDFを差し替えました`);
        fetchMaterials();
      } else {
        setMessage(data.error || "PDFの差し替えに失敗しました");
      }
    } catch {
      setMessage("PDFの差し替えに失敗しました");
    } finally {
      setReplacingId(null);
    }
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
          <PdfDropZone file={file} inputRef={inputRef} onSelect={selectFile} />

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
            {file && (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                取得パス: {getFileDisplayPath(file)}
              </p>
            )}
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
              className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                replaceDraggingId === material.id
                  ? "border-primary-500 bg-primary-50"
                  : material.fileExists === false
                    ? "border-red-200 bg-red-50/30"
                    : ""
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setReplaceDraggingId(material.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "copy";
                setReplaceDraggingId(material.id);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setReplaceDraggingId(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setReplaceDraggingId(null);
                void handleReplace(material, event.dataTransfer.files?.[0] || null);
              }}
            >
              <FileText className="h-5 w-5 shrink-0 text-primary-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{material.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>
                    {material.originalName} / {formatSize(material.size)} / 紐づけ{" "}
                    {material._count?.questions ?? 0}問
                  </span>
                  {material.fileExists === false && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      ファイル欠落
                    </span>
                  )}
                  {replaceDraggingId === material.id && (
                    <span className="font-medium text-primary-600">
                      ここにドロップして差し替え
                    </span>
                  )}
                </div>
              </div>
              {material.fileExists === false ? (
                <span
                  className="rounded-lg p-2 text-gray-200"
                  title="PDFファイルが見つかりません"
                >
                  <ExternalLink className="h-4 w-4" />
                </span>
              ) : (
                <a
                  href={`/api/materials/${material.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-500"
                  title="PDFを開く"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <label
                className={`rounded-lg p-2 text-gray-400 hover:bg-primary-50 hover:text-primary-500 ${
                  replacingId === material.id ? "pointer-events-none opacity-50" : "cursor-pointer"
                }`}
                title="PDFを差し替え"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    replacingId === material.id ? "animate-spin" : ""
                  }`}
                />
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  disabled={replacingId !== null}
                  onChange={(event) => {
                    const selected = event.target.files?.[0] || null;
                    event.currentTarget.value = "";
                    void handleReplace(material, selected);
                  }}
                />
              </label>
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
