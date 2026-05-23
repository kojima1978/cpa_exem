/**
 * SM-2 spaced repetition algorithm.
 * Shared by answer saving and review scheduling.
 */

export type SM2Result = {
  interval: number;
  easeFactor: number;
  consecutiveCorrect: number;
  nextReviewAt: Date;
};

/**
 * Calculate SM-2 parameters from answer history.
 * @param answers - Array of isCorrect booleans, most recent first (desc order)
 * @param lastAnsweredAt - Timestamp of the most recent answer
 */
export function calculateSM2(
  answers: boolean[],
  lastAnsweredAt: Date,
): SM2Result {
  let easeFactor = 2.5;
  let interval = 1;
  let consecutiveCorrect = 0;

  // Process in chronological order (oldest first)
  const chronological = [...answers].reverse();

  for (const isCorrect of chronological) {
    if (isCorrect) {
      consecutiveCorrect++;
      if (consecutiveCorrect === 1) {
        interval = 1;
      } else if (consecutiveCorrect === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      easeFactor = Math.max(1.3, easeFactor + 0.1);
    } else {
      consecutiveCorrect = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }
  }

  const nextReviewAt = new Date(
    lastAnsweredAt.getTime() + interval * 86400000,
  );

  return { interval, easeFactor, consecutiveCorrect, nextReviewAt };
}
