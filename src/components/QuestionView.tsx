"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Star,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Square,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Pencil,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { PracticeQuestion, AnswerRecord } from "@/app/practice/page";

type Props = {
  question: PracticeQuestion;
  index: number;
  total: number;
  answer: AnswerRecord | undefined;
  isBookmarked: boolean;
  onAnswer: (choiceId: number) => void;
  onSkip: () => void;
  onUnsure: () => void;
  onNext: () => void;
  onFinish: () => void;
  onToggleBookmark: () => void;
  onQuestionUpdate?: (updated: PracticeQuestion) => void;
};

type EditState = {
  text: string;
  briefExplanation: string;
  detailedExplanation: string;
  sourceReference: string;
  correctChoiceId: number;
};

function formatMaruBatsuChoice(text: string | undefined): string {
  if (text === "正しい") return "○ 正しい";
  if (text === "誤り") return "× 誤り";
  return "未選択";
}

export function QuestionView({
  question,
  index,
  total,
  answer,
  isBookmarked,
  onAnswer,
  onSkip,
  onUnsure,
  onNext,
  onFinish,
  onToggleBookmark,
  onQuestionUpdate,
}: Props) {
  const [showDetailed, setShowDetailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"success" | "error" | null>(
    null,
  );
  const [editState, setEditState] = useState<EditState>({
    text: "",
    briefExplanation: "",
    detailedExplanation: "",
    sourceReference: "",
    correctChoiceId: 0,
  });

  const answered = !!answer;
  const isLast = index + 1 >= total;

  const isMaruBatsu = useMemo(() => {
    if (question.choices.length !== 2) return false;
    const texts = question.choices.map((c) => c.text).sort();
    return texts[0] === "正しい" && texts[1] === "誤り";
  }, [question.choices]);

  const correctChoice = useMemo(
    () => question.choices.find((c) => c.isCorrect),
    [question.choices],
  );

  const chosenChoice = useMemo(
    () =>
      answer?.chosenChoiceId
        ? question.choices.find((c) => c.id === answer.chosenChoiceId)
        : undefined,
    [answer?.chosenChoiceId, question.choices],
  );

  const shuffledChoices = useMemo(() => {
    if (isMaruBatsu) return question.choices;
    return [...question.choices]
      .map((c) => ({ ...c, _sort: Math.random() }))
      .sort((a, b) => a._sort - b._sort);
  }, [question.id, isMaruBatsu]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editing) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Before answering: 1/← for ○, 2/→ for ×, s for skip
      if (!answered) {
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          onSkip();
          return;
        }
        if (isMaruBatsu) {
          if (e.key === "1" || e.key === "ArrowLeft") {
            e.preventDefault();
            const choice = question.choices.find((c) => c.text === "正しい");
            if (choice) onAnswer(choice.id);
            return;
          }
          if (e.key === "2" || e.key === "ArrowRight") {
            e.preventDefault();
            const choice = question.choices.find((c) => c.text === "誤り");
            if (choice) onAnswer(choice.id);
            return;
          }
        }
      }

      // After answering: Enter/Space for next, b for bookmark, u for unsure
      if (answered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          isLast ? onFinish() : onNext();
          return;
        }
        if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          onToggleBookmark();
          return;
        }
        if ((e.key === "u" || e.key === "U") && answer?.isCorrect && !answer?.unsure) {
          e.preventDefault();
          onUnsure();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answered, editing, isMaruBatsu, isLast, question.choices, answer, onAnswer, onSkip, onUnsure, onNext, onFinish, onToggleBookmark]);

  const recentHistory = question.answerHistories || [];
  const progressPercent = ((index + (answered ? 1 : 0)) / total) * 100;

  const startEditing = () => {
    setEditState({
      text: question.text,
      briefExplanation: question.briefExplanation,
      detailedExplanation: question.detailedExplanation,
      sourceReference: question.sourceReference,
      correctChoiceId: correctChoice?.id ?? 0,
    });
    setSaveResult(null);
    setEditing(true);
    // Auto-expand detailed explanation when editing
    setShowDetailed(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const body: Record<string, unknown> = {};
      if (editState.text !== question.text) body.text = editState.text;
      if (editState.briefExplanation !== question.briefExplanation)
        body.briefExplanation = editState.briefExplanation;
      if (editState.detailedExplanation !== question.detailedExplanation)
        body.detailedExplanation = editState.detailedExplanation;
      if (editState.sourceReference !== question.sourceReference)
        body.sourceReference = editState.sourceReference;

      const currentCorrect = question.choices.find((c) => c.isCorrect);
      if (currentCorrect && editState.correctChoiceId !== currentCorrect.id) {
        body.correctChoiceId = editState.correctChoiceId;
      }

      if (Object.keys(body).length === 0) {
        setEditing(false);
        return;
      }

      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");

      const updated = await res.json();
      setSaveResult("success");

      // Notify parent to update local state
      if (onQuestionUpdate) {
        onQuestionUpdate({
          ...question,
          text: updated.text,
          briefExplanation: updated.briefExplanation,
          detailedExplanation: updated.detailedExplanation,
          sourceReference: updated.sourceReference,
          choices: updated.choices.map(
            (c: { id: number; text: string; isCorrect: boolean; displayOrder: number }) => ({
              id: c.id,
              text: c.text,
              isCorrect: c.isCorrect,
              displayOrder: c.displayOrder,
            }),
          ),
        });
      }

      setTimeout(() => {
        setEditing(false);
        setSaveResult(null);
      }, 800);
    } catch {
      setSaveResult("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="shrink-0 text-sm text-gray-500">
          {index + 1} / {total}
        </span>
      </div>

      {/* Question card */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-start justify-between gap-2 border-b px-5 py-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-primary-50 px-2 py-0.5 font-medium text-primary-700">
              {question.topic.name}
            </span>
            {question.session && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                {question.session.name}
              </span>
            )}
            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
              {["", "出題高", "普通", "出題低"][question.difficulty]}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {answered && !editing && (
              <button
                onClick={startEditing}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="問題を修正"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onToggleBookmark}
              className={`rounded-lg p-1.5 transition-colors ${
                isBookmarked
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-gray-300 hover:text-yellow-400"
              }`}
            >
              <Star
                className="h-5 w-5"
                fill={isBookmarked ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {editing ? (
            <textarea
              value={editState.text}
              onChange={(e) =>
                setEditState((s) => ({ ...s, text: e.target.value }))
              }
              className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              rows={Math.max(3, editState.text.split("\n").length + 1)}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.text}
            </p>
          )}
        </div>

        {/* Correct answer toggle (edit mode only) */}
        {editing && isMaruBatsu && (
          <div className="border-t px-5 py-3">
            <label className="text-xs font-medium text-gray-500">
              正解を変更:
            </label>
            <div className="mt-1.5 flex gap-3">
              {question.choices
                .slice()
                .sort((a, b) => (a.text === "正しい" ? -1 : 1))
                .map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() =>
                      setEditState((s) => ({
                        ...s,
                        correctChoiceId: choice.id,
                      }))
                    }
                    className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      editState.correctChoiceId === choice.id
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {editState.correctChoiceId === choice.id && (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {choice.text === "正しい" ? "○ 正しい" : "× 誤り"}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Choices (hidden in edit mode) */}
        {!editing &&
          (isMaruBatsu ? (
            <div className="space-y-3 px-5 pb-5">
            <div className="grid grid-cols-2 gap-3">
              {question.choices
                .slice()
                .sort((a, b) => (a.text === "正しい" ? -1 : 1))
                .map((choice) => {
                  const isChosen = answer?.chosenChoiceId === choice.id;
                  const isCorrectChoice = choice.text === "正しい";
                  let style = isCorrectChoice
                    ? "border-primary-200 hover:border-primary-400 hover:bg-primary-50"
                    : "border-gray-200 hover:border-red-300 hover:bg-red-50";
                  if (answered) {
                    if (isChosen && answer.isCorrect) {
                      style =
                        "border-green-400 bg-green-50 ring-2 ring-green-300";
                    } else if (isChosen && !answer.isCorrect) {
                      style = "border-red-400 bg-red-50 ring-2 ring-red-300";
                    } else if (choice.isCorrect) {
                      style = "border-green-400 bg-green-50";
                    } else {
                      style = "border-gray-200 opacity-40";
                    }
                  }
                  return (
                    <button
                      key={choice.id}
                      disabled={answered}
                      onClick={() => onAnswer(choice.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-5 text-center font-bold transition-all ${style}`}
                    >
                      <span
                        className={`text-3xl ${
                          answered
                            ? isChosen && answer.isCorrect
                              ? "text-green-500"
                              : isChosen
                                ? "text-red-500"
                                : choice.isCorrect
                                  ? "text-green-500"
                                  : "text-gray-300"
                            : isCorrectChoice
                              ? "text-primary-400"
                              : "text-gray-400"
                        }`}
                      >
                        {isCorrectChoice ? "○" : "×"}
                      </span>
                      <span className="text-sm text-gray-600">
                        {choice.text}
                      </span>
                      <span className="flex min-h-6 flex-wrap items-center justify-center gap-1">
                        {answered && isChosen && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              answer.isCorrect
                                ? "bg-green-600 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            あなたの回答
                          </span>
                        )}
                        {answered && choice.isCorrect && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 ring-1 ring-green-300">
                            正解
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>
            {!answered && (
              <button
                onClick={onSkip}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-400 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600"
              >
                <HelpCircle className="h-4 w-4" />
                わからない
                <span className="text-xs opacity-60">(S)</span>
              </button>
            )}
            </div>
          ) : (
            <div className="space-y-2 px-5 pb-5">
              {shuffledChoices.map((choice) => {
                const isChosen = answer?.chosenChoiceId === choice.id;
                let style =
                  "border-gray-200 hover:border-primary-300 hover:bg-primary-50";
                if (answered) {
                  if (choice.isCorrect) {
                    style = "border-green-400 bg-green-50";
                  } else if (isChosen && !choice.isCorrect) {
                    style = "border-red-400 bg-red-50";
                  } else {
                    style = "border-gray-200 opacity-60";
                  }
                }

                return (
                  <button
                    key={choice.id}
                    disabled={answered}
                    onClick={() => onAnswer(choice.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${style}`}
                  >
                    {answered ? (
                      choice.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                      ) : isChosen ? (
                        <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                      ) : (
                        <Square className="h-5 w-5 shrink-0 text-gray-300" />
                      )
                    ) : (
                      <Square className="h-5 w-5 shrink-0 text-gray-300" />
                    )}
                    <span>{choice.text}</span>
                  </button>
                );
              })}
              {!answered && (
                <button
                  onClick={onSkip}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-400 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600"
                >
                  <HelpCircle className="h-4 w-4" />
                  わからない
                  <span className="text-xs opacity-60">(S)</span>
                </button>
              )}
            </div>
          ))}
      </div>

      {/* Answer feedback */}
      {answered && (
        <div className="space-y-3">
          <div
            className={`rounded-xl border p-4 ${
              answer.skipped
                ? "border-amber-200 bg-amber-50"
                : answer.isCorrect
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {answer.skipped ? (
                <HelpCircle className="h-5 w-5 text-amber-600" />
              ) : answer.isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span
                className={`font-bold ${
                  answer.skipped
                    ? "text-amber-700"
                    : answer.isCorrect
                      ? "text-green-700"
                      : "text-red-700"
                }`}
              >
                {answer.skipped ? "わからない → 復習対象に登録" : answer.isCorrect ? "正解！" : "不正解"}
              </span>

              {/* Recent history */}
              {recentHistory.length > 0 && (
                <div className="ml-auto flex items-center gap-1 text-xs">
                  <span className="text-gray-400">直近:</span>
                  {recentHistory.map((h, i) => (
                    <span
                      key={i}
                      className={
                        h.isCorrect ? "text-green-500" : "text-red-500"
                      }
                    >
                      {h.isCorrect ? "○" : "×"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isMaruBatsu && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div
                  className={`rounded-lg border bg-white/80 p-3 ${
                    answer.skipped
                      ? "border-amber-200"
                      : answer.isCorrect
                        ? "border-green-200"
                        : "border-red-200"
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500">
                    あなたの回答
                  </div>
                  <div
                    className={`mt-1 text-lg font-bold ${
                      answer.skipped
                        ? "text-amber-700"
                        : answer.isCorrect
                          ? "text-green-700"
                          : "text-red-700"
                    }`}
                  >
                    {answer.skipped
                      ? "わからない"
                      : formatMaruBatsuChoice(chosenChoice?.text)}
                  </div>
                </div>
                <div className="rounded-lg border border-green-200 bg-white/80 p-3">
                  <div className="text-xs font-medium text-gray-500">正解</div>
                  <div className="mt-1 text-lg font-bold text-green-700">
                    {formatMaruBatsuChoice(correctChoice?.text)}
                  </div>
                </div>
              </div>
            )}

            {/* Source reference (根拠条文) */}
            {!editing && question.sourceReference && (
              <p className="mt-2 text-xs text-gray-500">
                📖 {question.sourceReference}
              </p>
            )}

            {editing ? (
              <div className="mt-2">
                <label className="text-xs font-medium text-gray-500">
                  簡易解説:
                </label>
                <textarea
                  value={editState.briefExplanation}
                  onChange={(e) =>
                    setEditState((s) => ({
                      ...s,
                      briefExplanation: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-amber-300 bg-white p-3 text-sm leading-relaxed focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  rows={Math.max(
                    2,
                    editState.briefExplanation.split("\n").length + 1,
                  )}
                />
              </div>
            ) : (
              question.briefExplanation && (
                <MarkdownContent className="mt-2 text-gray-700">
                  {question.briefExplanation}
                </MarkdownContent>
              )
            )}
          </div>

          {/* Detailed explanation */}
          {(question.detailedExplanation || editing) && (
            <div className="rounded-xl border bg-white shadow-sm">
              <button
                onClick={() => setShowDetailed(!showDetailed)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>詳しく見る</span>
                {showDetailed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showDetailed && (
                <div className="border-t px-4 py-3">
                  {editing ? (
                    <div>
                      <label className="text-xs font-medium text-gray-500">
                        詳細解説:
                      </label>
                      <textarea
                        value={editState.detailedExplanation}
                        onChange={(e) =>
                          setEditState((s) => ({
                            ...s,
                            detailedExplanation: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                        rows={Math.max(
                          2,
                          editState.detailedExplanation.split("\n").length + 1,
                        )}
                        placeholder="詳細解説を入力..."
                      />
                      <label className="mt-3 block text-xs font-medium text-gray-500">
                        根拠条文:
                      </label>
                      <input
                        type="text"
                        value={editState.sourceReference}
                        onChange={(e) =>
                          setEditState((s) => ({
                            ...s,
                            sourceReference: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                        placeholder="例: 「企業会計原則」第一 一"
                      />
                    </div>
                  ) : (
                    <MarkdownContent className="text-gray-700">
                      {question.detailedExplanation}
                    </MarkdownContent>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit mode: Save/Cancel bar */}
          {editing && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                キャンセル
              </button>
              {saveResult === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  保存しました
                </span>
              )}
              {saveResult === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <XCircle className="h-4 w-4" />
                  保存に失敗しました
                </span>
              )}
            </div>
          )}

          {/* Unsure button — only after correct answer, not in edit mode */}
          {!editing && answer.isCorrect && !answer.skipped && (
            <div>
              {answer.unsure ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  自信なし — 復習対象に登録済み
                </div>
              ) : (
                <button
                  onClick={onUnsure}
                  className="flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  自信なし（復習対象に登録）
                  <span className="text-xs opacity-60">(U)</span>
                </button>
              )}
            </div>
          )}

          {/* Next / Finish buttons (hidden in edit mode) */}
          {!editing && (
            <div className="flex gap-3">
              {isLast ? (
                <button
                  onClick={onFinish}
                  className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
                >
                  結果を見る
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
                >
                  次の問題へ
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {!isLast && (
                <button
                  onClick={onFinish}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  終了
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
