import { describe, expect, it } from "vitest";
import { ORIENTATIONS } from "./pieces";
import { checkMove, isLegalMove, newGame, placementSquares } from "./rules";
import {
  COLORS,
  type Color,
  CornersState,
  FOUR_PLAYER,
  type Move,
  PIECE_IDS,
  type PieceId,
  TWO_PLAYER,
} from "./types";

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

type Squares = [x: number, y: number][];

/** A 4-player game with `color` to move, where `cells` are already taken. */
const game = (cells: Partial<Record<Color, Squares>> = {}, turn: Color = "blue") => {
  const state = { ...newGame(FOUR_PLAYER), turn };
  for (const color of COLORS) {
    for (const [x, y] of cells[color] ?? []) state.board[y * 20 + x] = COLORS.indexOf(color) + 1;
  }
  return state;
};

/** Places a piece with its origin at (x, y), in its base orientation by default. */
const place = (pieceId: PieceId, x: number, y: number, orientation = 0): Move => ({
  kind: "place",
  pieceId,
  orientation,
  x,
  y,
});

/** Blue has played its first piece, a monomino in its corner. */
const blueStarted: { blue: Squares } = { blue: [[0, 0]] };

describe("placementSquares", () => {
  it("offsets the oriented shape by the placement's origin", () => {
    expect(placementSquares({ pieceId: "V3", orientation: 0, x: 5, y: 7 })).toEqual([
      [5, 7],
      [5, 8],
      [6, 8],
    ]);
  });

  it("uses the chosen orientation", () => {
    const vertical = ORIENTATIONS.I2.findIndex((shape) => shape[1]?.[0] === 0);
    expect(placementSquares({ pieceId: "I2", orientation: vertical, x: 3, y: 3 })).toEqual([
      [3, 3],
      [3, 4],
    ]);
  });

  it("is null for an orientation the piece doesn't have", () => {
    expect(placementSquares({ pieceId: "X5", orientation: 1, x: 0, y: 0 })).toBeNull();
  });
});

describe("checkMove", () => {
  describe("turn", () => {
    it("allows the color whose turn it is", () => {
      expect(checkMove(game(), "blue", place("I1", 0, 0))).toEqual({ ok: true });
    });

    it("rejects a color whose turn it isn't", () => {
      expect(checkMove(game(), "yellow", place("I1", 19, 0))).toEqual({
        ok: false,
        reason: "not-your-turn",
      });
    });
  });

  describe("pieces", () => {
    it("allows a piece still in hand", () => {
      expect(isLegalMove(game(), "blue", place("I5", 0, 0))).toBe(true);
    });

    it("rejects a piece already placed", () => {
      const state = game();
      state.remaining.blue = state.remaining.blue.filter((id) => id !== "I5");
      expect(checkMove(state, "blue", place("I5", 0, 0))).toEqual({
        ok: false,
        reason: "piece-used",
      });
    });

    it("only looks at the moving color's pieces", () => {
      const state = game();
      state.remaining.yellow = [];
      expect(isLegalMove(state, "blue", place("I5", 0, 0))).toBe(true);
    });

    it("rejects an orientation the piece doesn't have", () => {
      expect(checkMove(game(), "blue", place("O4", 0, 0, 1))).toEqual({
        ok: false,
        reason: "unknown-orientation",
      });
    });
  });

  describe("board", () => {
    it("allows a piece flush with the board's far edge", () => {
      expect(isLegalMove(game({}, "red"), "red", place("I5", 15, 19))).toBe(true);
    });

    it("rejects a piece that hangs off the right", () => {
      expect(checkMove(game({}, "red"), "red", place("I5", 16, 19))).toEqual({
        ok: false,
        reason: "off-board",
      });
    });

    it("rejects a piece that hangs off the bottom", () => {
      expect(checkMove(game({}, "red"), "red", place("V3", 18, 19))).toEqual({
        ok: false,
        reason: "off-board",
      });
    });

    it("allows empty squares next to other colors", () => {
      const state = game({ ...blueStarted, yellow: [[2, 2]] });
      expect(isLegalMove(state, "blue", place("I1", 1, 1))).toBe(true);
    });

    it("rejects a square another color has taken", () => {
      const state = game({ ...blueStarted, yellow: [[1, 1]] });
      expect(checkMove(state, "blue", place("I1", 1, 1))).toEqual({
        ok: false,
        reason: "occupied",
      });
    });

    it("rejects covering its own squares", () => {
      expect(checkMove(game(blueStarted), "blue", place("I2", 0, 0))).toEqual({
        ok: false,
        reason: "occupied",
      });
    });
  });

  describe("first piece", () => {
    it.each([
      ["blue", place("I1", 0, 0)],
      ["yellow", place("I3", 17, 0)],
      ["red", place("O4", 18, 18)],
      ["green", place("L4", 0, 17)],
    ] as const)("allows %s to cover its starting corner", (color, move) => {
      expect(checkMove(game({}, color), color, move)).toEqual({ ok: true });
    });

    it("rejects a first piece away from the corner", () => {
      expect(checkMove(game(), "blue", place("I1", 1, 1))).toEqual({
        ok: false,
        reason: "misses-corner",
      });
    });

    it("rejects a first piece in another color's corner", () => {
      expect(checkMove(game(), "blue", place("I1", 19, 19))).toEqual({
        ok: false,
        reason: "misses-corner",
      });
    });

    it("uses the variant's corners", () => {
      const state = game();
      state.variant = { ...state.variant, corners: { ...state.variant.corners, blue: [5, 5] } };
      expect(isLegalMove(state, "blue", place("I1", 5, 5))).toBe(true);
      expect(isLegalMove(state, "blue", place("I1", 0, 0))).toBe(false);
    });
  });

  describe("later pieces", () => {
    it("allows touching its own color corner to corner", () => {
      expect(checkMove(game(blueStarted), "blue", place("I2", 1, 1))).toEqual({ ok: true });
    });

    it("rejects a piece that doesn't touch its own color", () => {
      expect(checkMove(game(blueStarted), "blue", place("I2", 5, 5))).toEqual({
        ok: false,
        reason: "no-corner-contact",
      });
    });

    it("rejects a piece that only touches another color corner to corner", () => {
      const state = game({ ...blueStarted, yellow: [[5, 5]] });
      expect(checkMove(state, "blue", place("I1", 6, 6))).toEqual({
        ok: false,
        reason: "no-corner-contact",
      });
    });

    it("allows a piece with no edge against its own color", () => {
      const state = game({
        blue: [
          [0, 0],
          [1, 1],
        ],
      });
      expect(isLegalMove(state, "blue", place("I1", 2, 0))).toBe(true);
    });

    it("rejects sharing an edge with its own color", () => {
      expect(checkMove(game(blueStarted), "blue", place("I1", 1, 0))).toEqual({
        ok: false,
        reason: "touches-own-edge",
      });
    });

    it("rejects sharing an edge even when it also touches a corner", () => {
      // The V3 covers (1, 1), diagonal to (0, 0), but also (0, 1), right below it.
      expect(checkMove(game(blueStarted), "blue", place("V3", 0, 1))).toEqual({
        ok: false,
        reason: "touches-own-edge",
      });
    });

    it("allows touching another color along an edge", () => {
      const state = game({ ...blueStarted, yellow: [[2, 1]] });
      expect(checkMove(state, "blue", place("I1", 1, 1))).toEqual({ ok: true });
    });
  });

  describe("passing", () => {
    it("allows a pass on the color's turn", () => {
      expect(checkMove(game(blueStarted), "blue", { kind: "pass" })).toEqual({ ok: true });
    });

    it("rejects a pass out of turn", () => {
      expect(checkMove(game(), "green", { kind: "pass" })).toEqual({
        ok: false,
        reason: "not-your-turn",
      });
    });
  });
});
