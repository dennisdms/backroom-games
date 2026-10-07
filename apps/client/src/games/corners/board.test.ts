import { applyMove, boardCorners, newGame, TWO_PLAYER } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { outlinePath, squareAt, startCorners } from "./board";

describe("startCorners", () => {
  const monomino = (x: number, y: number) =>
    ({ kind: "place", pieceId: "I1", orientation: 0, x, y }) as const;

  it("lists every empty corner for the color to move until its first piece is down", () => {
    const state = newGame(TWO_PLAYER);
    expect(startCorners(state)).toEqual(
      boardCorners(20).map((square) => ({ color: "blue", square })),
    );
    const next = applyMove(state, monomino(19, 19));
    expect(startCorners(next)).toEqual([
      { color: "yellow", square: [0, 0] },
      { color: "yellow", square: [19, 0] },
      { color: "yellow", square: [0, 19] },
    ]);
    expect(startCorners(applyMove(next, monomino(0, 0)))).toEqual([]);
  });
});

describe("outlinePath", () => {
  it("traces all four sides of a single square", () => {
    expect(outlinePath([[2, 3]])).toBe("M2 3h1M3 3v1M2 4h1M2 3v1");
  });

  it("skips sides shared between squares", () => {
    const path = outlinePath([
      [0, 0],
      [1, 0],
    ]);
    expect(path.match(/M/g)).toHaveLength(6);
    expect(path).not.toContain("M1 0v1");
  });
});

describe("squareAt", () => {
  const rect = { left: 10, top: 20, width: 200, height: 200 };

  it("maps a point to the square under it", () => {
    expect(squareAt(rect, 20, 10, 20)).toEqual([0, 0]);
    expect(squareAt(rect, 20, 35, 129)).toEqual([2, 10]);
    expect(squareAt(rect, 20, 209.9, 219.9)).toEqual([19, 19]);
  });

  it("returns null off the board", () => {
    expect(squareAt(rect, 20, 9, 50)).toBeNull();
    expect(squareAt(rect, 20, 50, 220)).toBeNull();
  });
});
