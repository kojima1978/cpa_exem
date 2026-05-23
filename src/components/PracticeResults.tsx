"use client";

import { useState } from "react";
import {
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  BarChart3,
  Home,
} from "lucide-react";
import Link from "next/link";
import type { PracticeQuestion, AnswerRecord } from "@/app/practice/page";

type Props = {
  questions: PracticeQuestion[];
  answers: AnswerRecord[];
  onRetry: () => void;
  onRetryWrong: () => void;
};

export function PracticeResults({ questions, answers, onRetry, onRetryWrong }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const totalAnswered = answers.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const avgTime =
    totalAnswered > 0
      ? Math.round(answers.reduce((s, a) => s + a.timeSpent, 0) / totalAnswered)
      : 0;

  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const answer of answers) {
    const q = questions.find((q) => q.id === answer.questionId);
    if (!q) continue;
    const name = q.topic.name;
    const stat = topicStats.get(name) || { correct: 0, total: 0 };
    stat.total++;
    if (answer.isCorrect) stat.correct++;
    topicStats.set(name, stat);
  }

  const wrongAnswers = answers.filter((a) => !a.isCorrect && !a.skipped);
  const skippedAnswers = answers.filter((a) => a.skipped);
  const unsureAnswers = answers.filter((a) => a.unsure);
  const retryCount = wrongAnswers.length + skippedAnswers.length + unsureAnswers.length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">演習結果</h1>

      {/* Score summary */}
      <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
        <div className="text-5xl font-bold text-primary-500">{accuracy}%</div>
        <p className="mt-1 text-gray-500">
          {correctCount} / {totalAnswered} 問正解
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <span>平均回答時間: {avgTime}秒</span>
          {skippedAnswers.length > 0 && (
            <span className="text-amber-600">わからない: {skippedAnswers.length}問</span>
          )}
          {unsureAnswers.length > 0 && (
            <span className="text-amber-600">自信なし: {unsureAnswers.length}問</span>
          )}
        </div>
      </div>

      {/* Topic breakdown */}
      {topicStats.size > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            分野別正答率
          </h2>
          <div className="mt-3 space-y-3">
            {Array.from(topicStats.entries()).map(([name, stat]) => {
              const pct = Math.round((stat.correct / stat.total) * 100);
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="text-gray-500">
                      {stat.correct}/{stat.total} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        pct >= 80
                          ? "bg-green-500"
                          : pct >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wrong answers */}
      {wrongAnswers.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-red-600">
            <XCircle className="h-5 w-5" />
            間違えた問題 ({wrongAnswers.length}問)
          </h2>
          <div className="mt-3 space-y-2">
            {wrongAnswers.map((answer) => {
              const q = questions.find((q) => q.id === answer.questionId);
              if (!q) return null;
              const isExpanded = expandedId === q.id;
              const correctChoice = q.choices.find((c) => c.isCorrect);
              const chosenChoice = q.choices.find(
                (c) => c.id === answer.chosenChoiceId
              );

              return (
                <div key={q.id} className="rounded-lg border">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span className="flex-1 text-sm line-clamp-2">
                      {q.text}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <div>
                          <span className="text-xs text-gray-400">あなたの回答:</span>
                          <p className="text-red-600">{chosenChoice?.text}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        <div>
                          <span className="text-xs text-gray-400">正解:</span>
                          <p className="text-green-700">{correctChoice?.text}</p>
                        </div>
                      </div>
                      {q.briefExplanation && (
                        <p className="rounded bg-gray-50 p-2 text-sm text-gray-600">
                          {q.briefExplanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skipped answers */}
      {skippedAnswers.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-amber-600">
            <HelpCircle className="h-5 w-5" />
            わからなかった問題 ({skippedAnswers.length}問)
          </h2>
          <div className="mt-3 space-y-2">
            {skippedAnswers.map((answer) => {
              const q = questions.find((q) => q.id === answer.questionId);
              if (!q) return null;
              const isExpanded = expandedId === q.id;
              const correctChoice = q.choices.find((c) => c.isCorrect);

              return (
                <div key={q.id} className="rounded-lg border">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span className="flex-1 text-sm line-clamp-2">
                      {q.text}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        <div>
                          <span className="text-xs text-gray-400">正解:</span>
                          <p className="text-green-700">{correctChoice?.text}</p>
                        </div>
                      </div>
                      {q.briefExplanation && (
                        <p className="rounded bg-gray-50 p-2 text-sm text-gray-600">
                          {q.briefExplanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unsure answers */}
      {unsureAnswers.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            自信なし ({unsureAnswers.length}問)
          </h2>
          <div className="mt-3 space-y-2">
            {unsureAnswers.map((answer) => {
              const q = questions.find((q) => q.id === answer.questionId);
              if (!q) return null;
              return (
                <div key={q.id} className="flex items-start gap-2 rounded-lg border px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span className="flex-1 text-sm line-clamp-2">{q.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
        >
          <RotateCcw className="h-4 w-4" />
          もう一度
        </button>
        {retryCount > 0 && (
          <button
            onClick={onRetryWrong}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600"
          >
            <RefreshCw className="h-4 w-4" />
            要復習{retryCount}問を再挑戦
          </button>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <Home className="h-4 w-4" />
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
