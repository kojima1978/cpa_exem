"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { TopicData, SessionData } from "@/types";

type ChoiceInput = { text: string; isCorrect: boolean };

type QuestionFormProps = {
  initialData?: {
    topicId: number;
    sessionId: number | null;
    text: string;
    difficulty: number;
    briefExplanation: string;
    detailedExplanation: string;
    sourceReference: string;
    year: number | null;
    choices: ChoiceInput[];
  };
  questionId?: number;
};

export function QuestionForm({ initialData, questionId }: QuestionFormProps) {
  const router = useRouter();
  const isEdit = !!questionId;

  const [topics, setTopics] = useState<TopicData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [saving, setSaving] = useState(false);

  const [topicId, setTopicId] = useState(initialData?.topicId ?? 0);
  const [sessionId, setSessionId] = useState(initialData?.sessionId ?? 0);
  const [text, setText] = useState(initialData?.text ?? "");
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? 1);
  const [briefExplanation, setBriefExplanation] = useState(
    initialData?.briefExplanation ?? ""
  );
  const [detailedExplanation, setDetailedExplanation] = useState(
    initialData?.detailedExplanation ?? ""
  );
  const [sourceReference, setSourceReference] = useState(
    initialData?.sourceReference ?? ""
  );
  const [year, setYear] = useState(initialData?.year ?? null);
  const [choices, setChoices] = useState<ChoiceInput[]>(
    initialData?.choices ?? [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]
  );

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics);
    fetch("/api/sessions").then((r) => r.json()).then(setSessions);
  }, []);

  const updateChoice = (index: number, field: keyof ChoiceInput, value: string | boolean) => {
    setChoices((prev) =>
      prev.map((c, i) => {
        if (i !== index) {
          return field === "isCorrect" && value === true
            ? { ...c, isCorrect: false }
            : c;
        }
        return { ...c, [field]: value };
      })
    );
  };

  const addChoice = () => {
    if (choices.length >= 6) return;
    setChoices([...choices, { text: "", isCorrect: false }]);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 2) return;
    setChoices(choices.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const body = {
      topicId,
      sessionId: sessionId || null,
      text,
      difficulty,
      briefExplanation,
      detailedExplanation,
      sourceReference,
      year: year || null,
      choices,
    };

    const url = isEdit ? `/api/questions/${questionId}` : "/api/questions";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (res.ok) {
      router.push("/admin/questions");
    } else {
      alert("保存に失敗しました");
    }
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass =
    "w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>分野 *</label>
          <select
            required
            value={topicId}
            onChange={(e) => setTopicId(Number(e.target.value))}
            className={inputClass}
          >
            <option value={0} disabled>選択してください</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>学習単位</label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(Number(e.target.value))}
            className={inputClass}
          >
            <option value={0}>なし</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>問題文 *</label>
        <textarea
          required
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputClass}
          placeholder="問題文を入力..."
        />
      </div>

      <div>
        <label className={labelClass}>選択肢 *</label>
        <div className="space-y-2">
          {choices.map((choice, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={choice.isCorrect}
                onChange={() => updateChoice(i, "isCorrect", true)}
                className="h-4 w-4 text-primary-500"
              />
              <input
                type="text"
                required
                value={choice.text}
                onChange={(e) => updateChoice(i, "text", e.target.value)}
                className={`flex-1 ${inputClass}`}
                placeholder={`選択肢 ${i + 1}`}
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(i)}
                  className="rounded-lg p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {choices.length < 6 && (
          <button
            type="button"
            onClick={addChoice}
            className="mt-2 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            選択肢を追加
          </button>
        )}
        <p className="mt-1 text-xs text-gray-400">
          ラジオボタンで正解を選択
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>難易度</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className={inputClass}
          >
            <option value={1}>1 - 易</option>
            <option value={2}>2 - 標準</option>
            <option value={3}>3 - 難</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>出題年度</label>
          <input
            type="number"
            value={year ?? ""}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
            className={inputClass}
            placeholder="例: 2024"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>簡易解説</label>
        <textarea
          rows={2}
          value={briefExplanation}
          onChange={(e) => setBriefExplanation(e.target.value)}
          className={inputClass}
          placeholder="回答直後に表示される一言解説..."
        />
      </div>

      <div>
        <label className={labelClass}>詳細解説</label>
        <textarea
          rows={5}
          value={detailedExplanation}
          onChange={(e) => setDetailedExplanation(e.target.value)}
          className={inputClass}
          placeholder="追加でチェック！の内容など..."
        />
      </div>

      <div>
        <label className={labelClass}>根拠条文</label>
        <input
          type="text"
          value={sourceReference}
          onChange={(e) => setSourceReference(e.target.value)}
          className={inputClass}
          placeholder="例: 「企業会計原則」第一 一"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-500 px-6 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? "保存中..." : isEdit ? "更新" : "作成"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/questions")}
          className="rounded-lg border px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
