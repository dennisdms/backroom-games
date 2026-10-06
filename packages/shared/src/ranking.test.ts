import { describe, expect, it } from "vitest";
import { rankByScore } from "./ranking";

describe("rankByScore", () => {
  it("ranks highest first, ties share a rank and the next one skips", () => {
    expect(rankByScore([5, 10, 5, 1])).toEqual([
      { player: 1, score: 10, rank: 1 },
      { player: 0, score: 5, rank: 2 },
      { player: 2, score: 5, rank: 2 },
      { player: 3, score: 1, rank: 4 },
    ]);
  });

  it("handles no players", () => {
    expect(rankByScore([])).toEqual([]);
  });
});
