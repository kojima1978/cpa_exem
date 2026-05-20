"use client";

import { useState } from "react";
import { Upload, Download, FileJson, FileSpreadsheet } from "lucide-react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
    total: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<"file" | "text">("file");

  const handleFileImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    const isCSV = file.name.endsWith(".csv");
    const body = await file.text();

    const res = await fetch("/api/questions/import", {
      method: "POST",
      headers: {
        "Content-Type": isCSV ? "text/csv" : "application/json",
      },
      body,
    });

    setResult(await res.json());
    setImporting(false);
  };

  const handleTextImport = async () => {
    if (!jsonText.trim()) return;
    setImporting(true);
    setResult(null);

    const res = await fetch("/api/questions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonText,
    });

    setResult(await res.json());
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">インポート / エクスポート</h1>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">インポート</h2>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setMode("file")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === "file"
                ? "bg-primary-500 text-white"
                : "border text-gray-600 hover:bg-gray-50"
            }`}
          >
            ファイル
          </button>
          <button
            onClick={() => setMode("text")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === "text"
                ? "bg-primary-500 text-white"
                : "border text-gray-600 hover:bg-gray-50"
            }`}
          >
            テキスト入力
          </button>
        </div>

        {mode === "file" ? (
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-8 hover:border-primary-400">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500">
                {file ? file.name : "JSON または CSV ファイルを選択"}
              </span>
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <button
              onClick={handleFileImport}
              disabled={!file || importing}
              className="mt-3 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {importing ? "インポート中..." : "インポート実行"}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              placeholder={`[\n  {\n    "topic": "簿記",\n    "text": "問題文...",\n    "choices": [\n      { "text": "選択肢1", "isCorrect": false },\n      { "text": "選択肢2", "isCorrect": true }\n    ]\n  }\n]`}
            />
            <button
              onClick={handleTextImport}
              disabled={!jsonText.trim() || importing}
              className="mt-3 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {importing ? "インポート中..." : "インポート実行"}
            </button>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border bg-gray-50 p-4">
            <p className="font-medium">
              結果: {result.imported} / {result.total} 件インポート成功
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600">エラー:</p>
                <ul className="mt-1 space-y-1 text-sm text-red-600">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">エクスポート</h2>
        <p className="mt-1 text-sm text-gray-500">
          登録済みの問題をダウンロード
        </p>
        <div className="mt-3 flex gap-3">
          <a
            href="/api/questions/export?format=json"
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileJson className="h-4 w-4" />
            JSON
          </a>
          <a
            href="/api/questions/export?format=csv"
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </a>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">CSV形式について</h2>
        <p className="mt-1 text-sm text-gray-500">
          以下のヘッダーを使用してください:
        </p>
        <code className="mt-2 block overflow-x-auto rounded bg-gray-100 p-3 text-xs">
          topic,session,text,difficulty,briefExplanation,detailedExplanation,year,choice1,choice2,choice3,choice4,choice5,correct
        </code>
        <p className="mt-2 text-xs text-gray-400">
          correct: 正解の選択肢番号（1〜5）
        </p>
      </div>
    </div>
  );
}
