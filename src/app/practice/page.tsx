"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { PracticeSetup } from "@/components/PracticeSetup";
import { QuestionView } from "@/components/QuestionView";
import { PracticeResults } from "@/components/PracticeResults";

export type PracticeQuestion = {
  id: number;
  text: string;
  difficulty: number;
  briefExplanation: string;
  detailedExplanation: string;
  topic: { id: number; name: string };
  session: { id: number; name: string } | null;
  choices: { id: number; text: string; isCorrect: boolean; displayOrder: number }[];
  bookmarks: { id: number }[];
  answerHistories: { isCorrect: boolean }[];
};

export type AnswerRecord = {
  questionId: number;
  chosenChoiceId: number;
  isCorrect: boolean;
  timeSpent: number;
};

type Phase = "setup" | "practice" | "results";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") || "all";

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((ids: number[]) => setBookmarkedIds(new Set(ids)));
  }, []);

  const handleStart = useCallback(async (params: URLSearchParams) => {
    const mode = params.get("mode");
    const limit = params.get("limit") || "20";
    const endpoint =
      mode === "review"
        ? `/api/review?limit=${limit}`
        : `/api/practice?${params}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    if (data.questions.length === 0) {
      alert("条件に一致する問題がありません");
      return;
    }
    setQuestions(data.questions);
    setCurrentIndex(0);
    setAnswers([]);
    startTimeRef.current = Date.now();
    setPhase("practice");
  }, []);

  const handleAnswer = useCallback(
    async (choiceId: number) => {
      const q = questions[currentIndex];
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          chosenChoiceId: choiceId,
          timeSpent,
        }),
      });
      const result = await res.json();

      setAnswers((prev) => [
        ...prev,
        {
          questionId: q.id,
          chosenChoiceId: choiceId,
          isCorrect: result.isCorrect,
          timeSpent,
        },
      ]);
    },
    [questions, currentIndex]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setPhase("results");
    } else {
      setCurrentIndex((i) => i + 1);
      startTimeRef.current = Date.now();
    }
  }, [currentIndex, questions.length]);

  const handleFinish = useCallback(() => {
    setPhase("results");
  }, []);

  const handleToggleBookmark = useCallback(async (questionId: number) => {
    const isBookmarked = bookmarkedIds.has(questionId);
    if (isBookmarked) {
      await fetch(`/api/bookmarks?questionId=${questionId}`, { method: "DELETE" });
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    } else {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      setBookmarkedIds((prev) => new Set(prev).add(questionId));
    }
  }, [bookmarkedIds]);

  const handleRetry = useCallback(() => {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
  }, []);

  if (phase === "setup") {
    return <PracticeSetup onStart={handleStart} initialMode={initialMode} />;
  }

  if (phase === "practice") {
    const currentQuestion = questions[currentIndex];
    const currentAnswer = answers.find(
      (a) => a.questionId === currentQuestion.id
    );
    return (
      <QuestionView
        key={currentQuestion.id}
        question={currentQuestion}
        index={currentIndex}
        total={questions.length}
        answer={currentAnswer}
        isBookmarked={bookmarkedIds.has(currentQuestion.id)}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onFinish={handleFinish}
        onToggleBookmark={() => handleToggleBookmark(currentQuestion.id)}
      />
    );
  }

  return (
    <PracticeResults
      questions={questions}
      answers={answers}
      onRetry={handleRetry}
    />
  );
}
