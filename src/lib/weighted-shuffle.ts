/**
 * Weighted random selection.
 * Higher weight = higher probability of being selected first.
 *
 * Uses exponential weighting: sortKey = random^(1/weight)
 * This gives items with weight 5 a much higher chance of
 * appearing near the top compared to weight 1.
 *
 * 出題頻度: 出題高(1)=5, 普通(2)=3, 出題低(3)=1
 */

const FREQUENCY_WEIGHTS: Record<number, number> = { 1: 5, 2: 3, 3: 1 };

/**
 * Select `limit` IDs from a pool using weighted random sampling.
 * @param pool - Array of { id, difficulty }
 * @param limit - Number of items to select
 * @returns Array of selected IDs in weighted-random order
 */
export function weightedSelect(
  pool: { id: number; difficulty: number }[],
  limit: number,
): number[] {
  return pool
    .map((q) => ({
      id: q.id,
      _sort: Math.random() ** (1 / (FREQUENCY_WEIGHTS[q.difficulty] || 1)),
    }))
    .sort((a, b) => b._sort - a._sort)
    .slice(0, limit)
    .map((q) => q.id);
}
