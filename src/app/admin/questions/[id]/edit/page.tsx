"use client";

import { useState, useEffect, use } from "react";
import { QuestionForm } from "@/components/QuestionForm";
import type { QuestionWithRelations } from "@/types";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [question, setQuestion] = useState<QuestionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setQuestion(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <p className="py-8 text-center text-gray-400">読み込み中...</p>;
  }

  if (!question) {
    return <p className="py-8 text-center text-gray-400">問題が見つかりません</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold">問題編集</h1>
      <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
        <QuestionForm
          questionId={question.id}
          initialData={{
            topicId: question.topicId,
            sessionId: question.sessionId,
            text: question.text,
            difficulty: question.difficulty,
            briefExplanation: question.briefExplanation,
            detailedExplanation: question.detailedExplanation,
            sourceReference: question.sourceReference,
            year: question.year,
            choices: question.choices.map((c) => ({
              text: c.text,
              isCorrect: c.isCorrect,
            })),
          }}
        />
      </div>
    </div>
  );
}
