import { describe, expect, it } from "vitest";
import { CORNERS, GAMES, gameInfo, playerRange, playerRangeLabel } from "./games";

describe("catalog", () => {
  it("lists Corners for 2 to 4 players", () => {
    expect(GAMES).toContain(CORNERS);
    expect(gameInfo("corners")).toEqual({
      id: "corners",
      name: "Corners",
      playerCounts: [2, 3, 4],
    });
    expect(gameInfo("chess")).toBeUndefined();
  });

  it("has unique ids and ascending player counts", () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
    for (const game of GAMES) {
      expect(game.playerCounts.length).toBeGreaterThan(0);
      expect([...game.playerCounts].sort((a, b) => a - b)).toEqual(game.playerCounts);
    }
  });
});

describe("playerRange", () => {
  it("shows min–max, or one number for a single count", () => {
    expect(playerRange([2, 3, 4])).toBe("2–4");
    expect(playerRange([4])).toBe("4");
  });

  it("spells it out for screen readers", () => {
    expect(playerRangeLabel([2, 3, 4])).toBe("2 to 4 players");
    expect(playerRangeLabel([4])).toBe("4 players");
    expect(playerRangeLabel([1])).toBe("1 player");
  });
});
