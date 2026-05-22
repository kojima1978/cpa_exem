"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  FileDown,
  FileText,
} from "lucide-react";
import type { TopicData } from "@/types";

type ImportResult = {
  imported: number;
  errors: string[];
  total: number;
};

const IMPORT_MODES = [
  { value: "file", label: "ファイル" },
  { value: "text", label: "JSON入力" },
  { value: "marubatsu", label: "○×テキスト" },
] as const;

type ImportMode = (typeof IMPORT_MODES)[number]["value"];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [mbText, setMbText] = useState("");
  const [mbTopicId, setMbTopicId] = useState("");
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<ImportMode>("marubatsu");

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics);
  }, []);

  const downloadTemplate = () => {
    const header =
      "topic,session,text,difficulty,briefExplanation,detailedExplanation,sourceReference,year,choice1,choice2,choice3,choice4,choice5,correct";
    const sample = [
      '"簿記"',
      '"企業会計原則"',
      '"次のうち、棚卸資産の評価方法として認められていないものはどれか。"',
      "2",
      '"正解は後入先出法。企業会計基準第9号により廃止された。"',
      '"企業会計基準第9号「棚卸資産の評価に関する会計基準」により、後入先出法は2010年4月以降適用の事業年度から廃止された。"',
      '""',
      "2024",
      '"先入先出法"',
      '"移動平均法"',
      '"後入先出法"',
      '"総平均法"',
      "",
      "3",
    ].join(",");
    const csv = "﻿" + header + "\n" + sample + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cpa-exam-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    const isCSV = file.name.endsWith(".csv");
    const body = await file.text();
    const res = await fetch("/api/questions/import", {
      method: "POST",
      headers: { "Content-Type": isCSV ? "text/csv" : "application/json" },
      body,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setResult({ imported: 0, errors: [data.error || "インポートに失敗しました"], total: 0 });
    } else {
      setResult(data);
    }
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
    const data = await res.json();
    if (!res.ok || data.error) {
      setResult({ imported: 0, errors: [data.error || "インポートに失敗しました"], total: 0 });
    } else {
      setResult(data);
    }
    setImporting(false);
  };

  const handleMaruBatsuImport = async () => {
    if (!mbText.trim() || !mbTopicId) return;
    setImporting(true);
    setResult(null);
    const res = await fetch("/api/questions/import-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: mbText, topicId: Number(mbTopicId) }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setResult({ imported: 0, errors: [data.error || "インポートに失敗しました"], total: 0 });
    } else {
      setResult(data);
    }
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">インポート / エクスポート</h1>

      {/* Import section */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">インポート</h2>

        <div className="mt-3 flex gap-2">
          {IMPORT_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => { setMode(m.value); setResult(null); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                mode === m.value
                  ? "bg-primary-500 text-white"
                  : "border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "file" && (
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
        )}

        {mode === "text" && (
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

        {mode === "marubatsu" && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分野（章）
              </label>
              <select
                value={mbTopicId}
                onChange={(e) => setMbTopicId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                問題＋解答テキスト
              </label>
              <textarea
                rows={16}
                value={mbText}
                onChange={(e) => setMbText(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                placeholder={`1.財務会計の機能\nロロロ 問題1 重要度A H22過去問\n金融商品取引法は…\n\nロロロ 問題1 正しい\n解説文…`}
              />
            </div>
            <button
              onClick={handleMaruBatsuImport}
              disabled={!mbText.trim() || !mbTopicId || importing}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {importing ? "インポート中..." : "○×問題をインポート"}
            </button>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-800">テキスト形式</p>
              <pre className="mt-1 whitespace-pre-wrap text-xs text-amber-700">{`[セクション] 1.財務会計の機能
[問題] ロロロ 問題1 重要度A H22過去問
       問題文（複数行可）
[解答] ロロロ 問題1 正しい
       解説文（複数行可）
[補足] 追加でチェック！
       補足説明文`}</pre>
              <ul className="mt-2 space-y-0.5 text-xs text-amber-600">
                <li>• セクション → 学習単位として自動登録</li>
                <li>• 重要度A/B/C → 難易度 難/標準/易</li>
                <li>• H22→2010, R4→2022（年度自動変換）</li>
                <li>• 選択肢は「正しい」「誤り」の2択で自動作成</li>
              </ul>
            </div>
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

      {/* Export section */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">エクスポート</h2>
        <p className="mt-1 text-sm text-gray-500">登録済みの問題をダウンロード</p>
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

      {/* CSV Template section */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">CSVテンプレート</h2>
        <p className="mt-1 text-sm text-gray-500">
          サンプル行付きのテンプレートをダウンロードして、そのまま編集・インポートできます。
        </p>
        <button
          onClick={downloadTemplate}
          className="mt-3 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
        >
          <FileDown className="h-4 w-4" />
          CSVテンプレートをダウンロード
        </button>

        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700">CSV列の説明</h3>
          <code className="mt-2 block overflow-x-auto rounded bg-gray-100 p-3 text-xs">
            topic,session,text,difficulty,briefExplanation,detailedExplanation,sourceReference,year,choice1,choice2,choice3,choice4,choice5,correct
          </code>
          <ul className="mt-2 space-y-0.5 text-xs text-gray-500">
            <li><strong>topic</strong>: 分野名（未登録の場合は自動作成）</li>
            <li><strong>session</strong>: 学習単位名（省略可、未登録の場合は自動作成）</li>
            <li><strong>difficulty</strong>: 1=易, 2=標準, 3=難</li>
            <li><strong>sourceReference</strong>: 根拠条文（省略可）</li>
            <li><strong>choice1〜5</strong>: 選択肢（最低2つ必須、5まで使用可）</li>
            <li><strong>correct</strong>: 正解の選択肢番号（1〜5）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
