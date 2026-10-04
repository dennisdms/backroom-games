import { describe, expect, it } from "vitest";
import { newGame } from "./rules";
import { COLORS, CornersState, FOUR_PLAYER, PIECE_IDS, TWO_PLAYER } from "./types";

describe.each([
  ["4 players", FOUR_PLAYER],
  ["2 players", TWO_PLAYER],
])("newGame with %s", (_, variant) => {
  const game = newGame(variant);

  it("is a valid state", () => {
    expect(CornersState.parse(game)).toEqual(game);
  });

  it("starts with an empty 20x20 board", () => {
    expect(game.board).toHaveLength(20 * 20);
    expect(game.board.every((cell) => cell === 0)).toBe(true);
  });

  it("gives every color all 21 pieces", () => {
    expect(Object.keys(game.remaining).sort()).toEqual([...COLORS].sort());
    for (const color of COLORS) {
      expect(game.remaining[color]).toEqual([...PIECE_IDS]);
    }
  });

  it("does not share inventories between colors", () => {
    expect(game.remaining.blue).not.toBe(game.remaining.yellow);
  });

  it("lets blue move first, then yellow, red, green", () => {
    expect(game.turn).toBe("blue");
    expect(game.variant.colors).toEqual(["blue", "yellow", "red", "green"]);
  });

  it("has no moves or passes yet", () => {
    expect(game.passes).toBe(0);
    expect(game.lastMove).toBeNull();
  });
});

describe("newGame seating", () => {
  it("gives each of 4 players one color", () => {
    expect(newGame(FOUR_PLAYER).variant.seats).toEqual([["blue"], ["yellow"], ["red"], ["green"]]);
  });

  it("pits blue and red against yellow and green with 2 players", () => {
    expect(newGame(TWO_PLAYER).variant.seats).toEqual([
      ["blue", "red"],
      ["yellow", "green"],
    ]);
  });
});
