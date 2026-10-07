import { FOUR_PLAYER, GAMES, type Move, newGame, THREE_PLAYER, TWO_PLAYER } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { findGame, maxPlayers } from ".";
import { corners } from "./corners";

const monominoAt = (x: number, y: number): Move => ({
  kind: "place",
  pieceId: "I1",
  orientation: 0,
  x,
  y,
});

/** A four-player game where blue (seat 0) moves first. */
const fourPlayers = () => corners.init([0, 1, 2, 3], undefined);

describe("registry", () => {
  it("finds Corners by id and seats up to four", () => {
    expect(findGame("corners")).toBe(corners);
    expect(findGame("chess")).toBeUndefined();
    expect(maxPlayers(corners)).toBe(4);
  });

  it.each(GAMES.map((game) => [game.id, game] as const))(
    "has a module for catalog game %s with the same player counts",
    (id, game) => {
      expect(findGame(id)?.playerCounts).toEqual(game.playerCounts);
    },
  );
});

describe("corners.init", () => {
  it("picks the variant by player count", () => {
    expect(corners.init([0, 1], undefined)).toEqual(newGame(TWO_PLAYER));
    expect(corners.init([0, 1, 2], undefined)).toEqual(newGame(THREE_PLAYER));
    expect(fourPlayers()).toEqual(newGame(FOUR_PLAYER));
  });

  it("can start with every player count it lists", () => {
    for (const count of corners.playerCounts) {
      const players = Array.from({ length: count }, (_, i) => i);
      expect(() => corners.init(players, undefined)).not.toThrow();
    }
  });

  it.each([[[0]], [[0, 1, 2, 3, 4]], [[0, 2]]])("rejects players %j", (players) => {
    expect(() => corners.init(players, undefined)).toThrow(/can't seat/);
  });
});

describe("corners.parseMove", () => {
  it("accepts moves and rejects anything else", () => {
    expect(corners.parseMove(monominoAt(0, 0))).toEqual(monominoAt(0, 0));
    expect(corners.parseMove({ kind: "pass" })).toEqual({ kind: "pass" });
    expect(corners.parseMove({ kind: "place", pieceId: "Q9", orientation: 0, x: 0, y: 0 })).toBe(
      null,
    );
    expect(corners.parseMove("pass")).toBeNull();
  });
});

describe("corners.validate", () => {
  it("lets the seat whose color is up move", () => {
    expect(corners.validate(fourPlayers(), 0, monominoAt(0, 0))).toEqual({ ok: true });
  });

  it("rejects other seats", () => {
    expect(corners.validate(fourPlayers(), 1, monominoAt(0, 0))).toEqual({
      ok: false,
      reason: "not-your-turn",
    });
  });

  it("passes on the rules' reason", () => {
    expect(corners.validate(fourPlayers(), 0, monominoAt(5, 5))).toEqual({
      ok: false,
      reason: "misses-corner",
    });
  });

  it("goes back to the first seat after the last with fewer than four", () => {
    let state = corners.init([0, 1, 2], undefined);
    state = corners.apply(state, 0, monominoAt(0, 0)); // blue
    state = corners.apply(state, 1, monominoAt(19, 0)); // yellow
    state = corners.apply(state, 2, monominoAt(19, 19)); // red
    expect(state.turn).toBe("blue");
    const domino: Move = { kind: "place", pieceId: "I2", orientation: 0, x: 1, y: 1 };
    expect(corners.validate(state, 0, domino)).toEqual({ ok: true });
    expect(corners.validate(state, 1, domino).ok).toBe(false);
  });

  it("rejects every move once the game is over", () => {
    const state = { ...fourPlayers(), remaining: { blue: [], yellow: [], red: [], green: [] } };
    expect(corners.isOver(state)).toBe(true);
    expect(corners.validate(state, 0, { kind: "pass" })).toEqual({
      ok: false,
      reason: "game-over",
    });
  });
});

describe("corners.apply", () => {
  it("applies the move without changing the old state", () => {
    const before = fourPlayers();
    const after = corners.apply(before, 0, monominoAt(0, 0));
    expect(after.board[0]).toBe(1);
    expect(after.turn).toBe("yellow");
    expect(before).toEqual(fourPlayers());
  });

  it("throws for a move validate rejects", () => {
    expect(() => corners.apply(fourPlayers(), 1, monominoAt(0, 0))).toThrow(/not-your-turn/);
  });
});

describe("corners.result", () => {
  it("only ranks the seats playing", () => {
    expect(corners.result(corners.init([0, 1], undefined))).toEqual([
      { player: 0, score: -89, rank: 1 },
      { player: 1, score: -89, rank: 1 },
    ]);
  });

  it("ranks seats by score, ties sharing a rank", () => {
    expect(corners.result(fourPlayers()).map((r) => r.rank)).toEqual([1, 1, 1, 1]);
    const state = corners.apply(fourPlayers(), 0, monominoAt(0, 0));
    expect(corners.result(state)).toEqual([
      { player: 0, score: -88, rank: 1 },
      { player: 1, score: -89, rank: 2 },
      { player: 2, score: -89, rank: 2 },
      { player: 3, score: -89, rank: 2 },
    ]);
  });
});

describe("corners.view", () => {
  it("shows everyone the full state", () => {
    const state = fourPlayers();
    expect(corners.view(state, 2)).toBe(state);
  });
});

describe("corners.colors", () => {
  it("gives each seat its variant colors", () => {
    expect(corners.colors(fourPlayers(), 2)).toEqual(["red"]);
    expect(corners.colors(corners.init([0, 1], undefined), 1)).toEqual(["yellow"]);
    expect(corners.colors(fourPlayers(), 7)).toEqual([]);
  });
});
