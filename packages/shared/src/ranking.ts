// Standings from scores, shared so the server's results and the client's
// results screen rank the same way.

/** Best first, by seat. Tied players share a rank, and the next rank skips: 1, 1, 3. */
export type Ranking = { player: number; score: number; rank: number }[];

/** Ranks players (seat indexes into `scores`) by score, highest first, with ties sharing a rank. */
export const rankByScore = (scores: readonly number[]): Ranking => {
  const sorted = scores
    .map((score, player) => ({ player, score }))
    .sort((a, b) => b.score - a.score || a.player - b.player);
  return sorted.map((entry) => ({
    ...entry,
    rank: 1 + sorted.filter((other) => other.score > entry.score).length,
  }));
};
