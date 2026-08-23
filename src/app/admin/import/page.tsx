"use client";

import { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { getFileDisplayPath, PdfDropZone } from "@/components/PdfDropZone";
import type { TopicData } from "@/types";

type ImportResult = {
  imported: number;
  errors: string[];
  total: number;
  materialTitle?: string;
};

const AI_IMPORT_PROMPT = `ソース資料を基に、ABCDの四択問題を作成してください。

出力はJSON形式の配列のみとし、必ずコードブロック内に出力してください。
説明文や前置きは不要です。

各問題は次の形式にしてください。

[
  {
    "subject": "相続税法",
    "topic": "分野名",
    "session": "章・学習単位名",
    "text": "問題文",
    "difficulty": 1,
    "briefExplanation": "正解の理由を1〜2文で簡潔に説明",
    "detailedExplanation": "根拠や注意点を含めて詳しく説明",
    "sourceReference": "根拠条文・資料名など",
    "sourcePdf": "アップロード済みPDFファイル名",
    "sourcePage": 12,
    "year": 2026,
    "choices": [
      { "text": "A. 選択肢A", "isCorrect": true },
      { "text": "B. 選択肢B", "isCorrect": false },
      { "text": "C. 選択肢C", "isCorrect": false },
      { "text": "D. 選択肢D", "isCorrect": false }
    ]
  }
]

条件:
- choicesは必ず4つにしてください。
- 正解は1つだけにしてください。
- isCorrectがtrueの選択肢を1つだけ設定してください。
- difficultyは 1=重要度A、2=重要度B、3=重要度C としてください。
- sourcePageには、根拠となるPDFページ番号を入れてください。
- sourcePdfには、管理画面に登録するPDFファイル名と同じ名前を入れてください。
- 問題文、選択肢、解説はソース資料の内容に基づいて作成してください。`;

const JSON_PLACEHOLDER = `[
  {
    "subject": "相続税法",
    "topic": "相続人と法定相続分",
    "session": "基礎編",
    "text": "問題文...",
    "difficulty": 1,
    "briefExplanation": "簡易解説...",
    "detailedExplanation": "詳細解説...",
    "sourceReference": "相続税法15条",
    "sourcePdf": "相続税法資料.pdf",
    "sourcePage": 12,
    "year": 2026,
    "choices": [
      { "text": "Aの内容", "isCorrect": true },
      { "text": "Bの内容", "isCorrect": false },
      { "text": "Cの内容", "isCorrect": false },
      { "text": "Dの内容", "isCorrect": false }
    ]
  }
]`;

export default function ImportPage() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [mbText, setMbText] = useState("");
  const [mbTopicId, setMbTopicId] = useState("");
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [promptCopyStatus, setPromptCopyStatus] = useState<
    "success" | "error" | null
  >(null);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const promptCopyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics);
  }, []);

  useEffect(() => {
    return () => {
      if (promptCopyTimerRef.current) {
        window.clearTimeout(promptCopyTimerRef.current);
      }
    };
  }, []);

  const downloadTemplate = () => {
    const header =
      "subject,topic,session,text,difficulty,briefExplanation,detailedExplanation,sourceReference,sourcePdf,sourcePage,year,choiceA,choiceB,choiceC,choiceD,correctAnswer";
    const sample = [
      '"相続税法"',
      '"相続人と法定相続分"',
      '"基礎編"',
      '"相続税の基礎控除額の説明として正しいものはどれか。"',
      "A",
      '"基礎控除は相続人数によって変わります。"',
      '"相続税の基礎控除額は、3,000万円 + 600万円 × 法定相続人の数で計算します。"',
      '"相続税法15条"',
      '"相続税法資料.pdf"',
      "12",
      "2026",
      '"3,000万円 + 600万円 × 法定相続人の数"',
      '"5,000万円 + 1,000万円 × 法定相続人の数"',
      '"相続財産の10%"',
      '"常に3,000万円"',
      "A",
    ].join(",");
    const csv = "﻿" + header + "\n" + sample + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notebooklm-abcd-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPrompt = async () => {
    if (promptCopyTimerRef.current) {
      window.clearTimeout(promptCopyTimerRef.current);
    }

    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
      setPromptCopyStatus("success");
    } catch {
      setPromptCopyStatus("error");
    }

    promptCopyTimerRef.current = window.setTimeout(
      () => setPromptCopyStatus(null),
      6000,
    );
  };

  const handlePdfSelect = (selectedFile: File | null) => {
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }

    if (!selectedFile) {
      setPdfFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setPdfFile(null);
      setResult({
        imported: 0,
        errors: ["PDFファイルを選択してください"],
        total: 0,
      });
      return;
    }

    setPdfFile(selectedFile);
    if (!pdfTitle.trim()) {
      setPdfTitle(selectedFile.name.replace(/\.pdf$/i, ""));
    }
    setResult(null);
  };

  const clearPdfSelect = () => {
    setPdfFile(null);
    setPdfTitle("");
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

  const uploadPdfIfNeeded = async () => {
    if (!pdfFile) return null;

    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("title", pdfTitle.trim() || pdfFile.name.replace(/\.pdf$/i, ""));

    const res = await fetch("/api/materials", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "PDFの登録に失敗しました");
    }
    return data as { id: number; title: string };
  };

  const submitImport = async (body: string, contentType: string) => {
    setImporting(true);
    setResult(null);
    try {
      const material = await uploadPdfIfNeeded();
      const url = material
        ? `/api/questions/import?materialId=${material.id}`
        : "/api/questions/import";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({
          imported: 0,
          errors: [data.error || "インポートに失敗しました"],
          total: 0,
        });
        return false;
      } else {
        setResult({ ...data, materialTitle: material?.title });
        if (material) {
          setPdfFile(null);
          setPdfTitle("");
        }
        return data.imported === data.total && data.errors.length === 0;
      }
    } catch (error) {
      setResult({
        imported: 0,
        errors: [
          error instanceof Error
            ? error.message
            : "インポート中にエラーが発生しました",
        ],
          total: 0,
      });
      return false;
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = async () => {
    if (!importFile) return;
    const isCSV = importFile.name.toLowerCase().endsWith(".csv");
    await submitImport(
      await importFile.text(),
      isCSV ? "text/csv" : "application/json",
    );
  };

  const handleTextImport = async () => {
    if (!jsonText.trim() || importing) return;

    const confirmed = window.confirm(
      "貼り付けたJSONをインポートしますか？\n全件成功後、二重取込み防止のため入力欄を空にします。",
    );
    if (!confirmed) return;

    const succeeded = await submitImport(jsonText, "application/json");
    if (succeeded) {
      setJsonText("");
    }
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
      setResult({
        imported: 0,
        errors: [data.error || "インポートに失敗しました"],
        total: 0,
      });
    } else {
      setResult(data);
    }
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">インポート / エクスポート</h1>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">AI生成プロンプト</h2>
            <p className="mt-1 text-sm text-gray-500">
              NotebookLMに貼り付けて、アプリ用JSONを作成します。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={copyPrompt}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                promptCopyStatus === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-primary-500 hover:bg-primary-600"
              }`}
            >
              {promptCopyStatus === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {promptCopyStatus === "success"
                ? "コピーしました"
                : "プロンプトをコピー"}
            </button>
            <div aria-live="polite" aria-atomic="true" className="min-h-5">
              {promptCopyStatus === "success" ? (
                <p
                  role="status"
                  className="flex items-center gap-1 text-sm font-medium text-green-700"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  プロンプトをクリップボードにコピーしました
                </p>
              ) : promptCopyStatus === "error" ? (
                <p role="alert" className="text-sm font-medium text-red-600">
                  コピーできませんでした。もう一度お試しください
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <textarea
          readOnly
          value={AI_IMPORT_PROMPT}
          rows={14}
          className="mt-4 w-full rounded-lg border bg-gray-50 px-3 py-2 font-mono text-xs leading-relaxed text-gray-700"
        />
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">問題を取り込む</h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              AI出力JSON
            </label>
            <textarea
              rows={18}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder={JSON_PLACEHOLDER}
            />
            <button
              onClick={handleTextImport}
              disabled={!jsonText.trim() || importing}
              className="mt-3 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {importing ? "インポート中..." : "JSONをインポート"}
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-gray-700">
                  PDF資料（任意）
                </label>
                {pdfFile && (
                  <button
                    type="button"
                    onClick={clearPdfSelect}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                    aria-label="PDF選択を解除"
                    title="PDF選択を解除"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <PdfDropZone
                file={pdfFile}
                inputRef={pdfInputRef}
                onSelect={handlePdfSelect}
                placeholder="PDFをドラッグ＆ドロップ"
                helperText="クリックしてPDFを選択することもできます"
                iconClassName="h-7 w-7 text-gray-400"
                paddingClassName="p-6"
                className="bg-white"
              />
              <input
                type="text"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="PDF資料名"
              />
              {pdfFile && (
                <p className="mt-2 text-xs text-gray-500">
                  取得パス: {getFileDisplayPath(pdfFile)}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary-400">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500">
                {importFile ? importFile.name : "JSON / CSV ファイルを選択"}
              </span>
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </label>
            <button
              onClick={handleFileImport}
              disabled={!importFile || importing}
              className="w-full rounded-lg border border-primary-500 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50"
            >
              {importing ? "インポート中..." : "ファイルをインポート"}
            </button>
            <button
              onClick={downloadTemplate}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileDown className="h-4 w-4" />
              CSVテンプレート
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-4 rounded-lg border bg-gray-50 p-4">
            <p className="font-medium">
              結果: {result.imported} / {result.total} 件インポート成功
            </p>
            {result.materialTitle && (
              <p className="mt-1 text-sm text-gray-600">
                PDF登録: {result.materialTitle}
              </p>
            )}
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
        <button
          onClick={() => setLegacyOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 font-bold">
            <FileText className="h-5 w-5 text-gray-400" />
            ○×テキストを取り込む
          </span>
          {legacyOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {legacyOpen && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                分野（章）
              </label>
              <select
                value={mbTopicId}
                onChange={(e) => setMbTopicId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                問題＋解答テキスト
              </label>
              <textarea
                rows={12}
                value={mbText}
                onChange={(e) => setMbText(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
          </div>
        )}
      </div>

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
    </div>
  );
}
