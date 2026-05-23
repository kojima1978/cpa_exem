/**
 * Streak calculation utilities.
 * Shared by home page and stats API.
 */

export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
    if (Math.round(diffDays) === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}
