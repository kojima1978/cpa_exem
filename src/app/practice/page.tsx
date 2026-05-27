"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  sourceReference: string;
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
  skipped?: boolean;
  unsure?: boolean;
};

type Phase = "setup" | "practice" | "results";

export default function PracticePage() {
  return (
    <Suspense>
      <PracticePageContent />
    </Suspense>
  );
}

function PracticePageContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") || "all";
  const initialSubjectId = searchParams.get("subjectId") || "";

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [isReviewSession, setIsReviewSession] = useState(false);
  const [reviewLaterIds, setReviewLaterIds] = useState<Set<number>>(new Set());
  const sessionStartedAtRef = useRef(Date.now());
  const questionStartedAtRef = useRef(Date.now());
  const elapsedSecondsByQuestionIdRef = useRef<Map<number, number>>(new Map());
  const submittedQuestionIdsRef = useRef<Set<number>>(new Set());

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
    const shuffle = params.get("shuffle") === "1";
    const qs = shuffle
      ? [...data.questions].sort(() => Math.random() - 0.5)
      : data.questions;
    setQuestions(qs);
    setCurrentIndex(0);
    setAnswers([]);
    setIsReviewSession(mode === "review");
    setReviewLaterIds(new Set());
    elapsedSecondsByQuestionIdRef.current.clear();
    submittedQuestionIdsRef.current.clear();
    sessionStartedAtRef.current = Date.now();
    questionStartedAtRef.current = Date.now();
    setPhase("practice");
  }, []);

  const pauseCurrentQuestionTimer = useCallback(() => {
    const q = questions[currentIndex];
    if (!q || answers.some((a) => a.questionId === q.id)) return;

    const elapsed = Math.max(
      0,
      Math.round((Date.now() - questionStartedAtRef.current) / 1000),
    );
    elapsedSecondsByQuestionIdRef.current.set(
      q.id,
      (elapsedSecondsByQuestionIdRef.current.get(q.id) ?? 0) + elapsed,
    );
  }, [answers, currentIndex, questions]);

  const getCurrentTimeSpent = useCallback((questionId: number) => {
    return Math.max(
      0,
      (elapsedSecondsByQuestionIdRef.current.get(questionId) ?? 0) +
        Math.round((Date.now() - questionStartedAtRef.current) / 1000),
    );
  }, []);

  const handleAnswer = useCallback(
    async (choiceId: number) => {
      const q = questions[currentIndex];
      if (
        !q ||
        answers.some((a) => a.questionId === q.id) ||
        submittedQuestionIdsRef.current.has(q.id)
      ) {
        return;
      }

      const timeSpent = getCurrentTimeSpent(q.id);
      submittedQuestionIdsRef.current.add(q.id);

      try {
        const res = await fetch("/api/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: q.id,
            chosenChoiceId: choiceId,
            timeSpent,
            ...(isReviewSession && { reviewMode: true }),
          }),
        });
        if (!res.ok) throw new Error("Failed to save answer");
        const result = await res.json();
        elapsedSecondsByQuestionIdRef.current.delete(q.id);

        setAnswers((prev) =>
          prev.some((a) => a.questionId === q.id)
            ? prev
            : [
                ...prev,
                {
                  questionId: q.id,
                  chosenChoiceId: choiceId,
                  isCorrect: result.isCorrect,
                  timeSpent,
                },
              ],
        );
      } catch {
        submittedQuestionIdsRef.current.delete(q.id);
        alert("回答の保存に失敗しました");
      }
    },
    [answers, currentIndex, getCurrentTimeSpent, isReviewSession, questions],
  );

  const handleSkip = useCallback(async () => {
    const q = questions[currentIndex];
    if (
      !q ||
      answers.some((a) => a.questionId === q.id) ||
      submittedQuestionIdsRef.current.has(q.id)
    ) {
      return;
    }

    const timeSpent = getCurrentTimeSpent(q.id);
    submittedQuestionIdsRef.current.add(q.id);

    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          skipped: true,
          timeSpent,
          ...(isReviewSession && { reviewMode: true }),
        }),
      });
      if (!res.ok) throw new Error("Failed to save answer");
      elapsedSecondsByQuestionIdRef.current.delete(q.id);

      setAnswers((prev) =>
        prev.some((a) => a.questionId === q.id)
          ? prev
          : [
              ...prev,
              {
                questionId: q.id,
                chosenChoiceId: 0,
                isCorrect: false,
                timeSpent,
                skipped: true,
              },
            ],
      );
    } catch {
      submittedQuestionIdsRef.current.delete(q.id);
      alert("回答の保存に失敗しました");
    }
  }, [answers, currentIndex, getCurrentTimeSpent, isReviewSession, questions]);

  const handleUnsure = useCallback(async (questionId: number) => {
    await fetch("/api/answers/unsure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });

    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId ? { ...a, unsure: true } : a,
      ),
    );
  }, []);

  const handleNext = useCallback(() => {
    pauseCurrentQuestionTimer();
    if (currentIndex + 1 >= questions.length) {
      setPhase("results");
    } else {
      setCurrentIndex((i) => i + 1);
      questionStartedAtRef.current = Date.now();
    }
  }, [currentIndex, pauseCurrentQuestionTimer, questions.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex === 0) return;
    pauseCurrentQuestionTimer();
    setCurrentIndex((i) => i - 1);
    questionStartedAtRef.current = Date.now();
  }, [currentIndex, pauseCurrentQuestionTimer]);

  const handleFinish = useCallback(() => {
    pauseCurrentQuestionTimer();
    setPhase("results");
  }, [pauseCurrentQuestionTimer]);

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

  const handleQuestionUpdate = useCallback(
    (updated: PracticeQuestion) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === updated.id ? updated : q)),
      );
    },
    [],
  );

  const handleToggleReviewLater = useCallback((questionId: number) => {
    setReviewLaterIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const handleJumpTo = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= questions.length || targetIndex === currentIndex) return;
    pauseCurrentQuestionTimer();
    setCurrentIndex(targetIndex);
    questionStartedAtRef.current = Date.now();
  }, [currentIndex, pauseCurrentQuestionTimer, questions.length]);

  const handleRetry = useCallback(() => {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setIsReviewSession(false);
    setReviewLaterIds(new Set());
    elapsedSecondsByQuestionIdRef.current.clear();
    submittedQuestionIdsRef.current.clear();
  }, []);

  const handleRetryWrong = useCallback(() => {
    const retryIds = new Set(
      answers
        .filter((a) => !a.isCorrect || a.unsure)
        .map((a) => a.questionId),
    );
    const wrongQuestions = questions.filter((q) => retryIds.has(q.id));
    if (wrongQuestions.length === 0) return;
    setQuestions(wrongQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    setIsReviewSession(true);
    setReviewLaterIds(new Set());
    elapsedSecondsByQuestionIdRef.current.clear();
    submittedQuestionIdsRef.current.clear();
    sessionStartedAtRef.current = Date.now();
    questionStartedAtRef.current = Date.now();
    setPhase("practice");
  }, [answers, questions]);

  if (phase === "setup") {
    return (
      <PracticeSetup
        onStart={handleStart}
        initialMode={initialMode}
        initialSubjectId={initialSubjectId}
      />
    );
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
        onSkip={handleSkip}
        onUnsure={() => handleUnsure(currentQuestion.id)}
        canGoPrevious={currentIndex > 0}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onFinish={handleFinish}
        onToggleBookmark={() => handleToggleBookmark(currentQuestion.id)}
        onQuestionUpdate={handleQuestionUpdate}
        allQuestions={questions}
        allAnswers={answers}
        onJumpTo={handleJumpTo}
        sessionStartedAt={sessionStartedAtRef.current}
        isReviewLater={reviewLaterIds.has(currentQuestion.id)}
        onToggleReviewLater={() => handleToggleReviewLater(currentQuestion.id)}
        reviewLaterIds={reviewLaterIds}
      />
    );
  }

  return (
    <PracticeResults
      questions={questions}
      answers={answers}
      onRetry={handleRetry}
      onRetryWrong={handleRetryWrong}
      reviewLaterIds={reviewLaterIds}
    />
  );
}
