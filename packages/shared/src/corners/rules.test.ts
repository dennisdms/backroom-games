import { describe, expect, it } from "vitest";
import { ORIENTATIONS } from "./pieces";
import {
  applyMove,
  boardCorners,
  checkMove,
  cornerCandidates,
  forfeitTurn,
  isGameOver,
  isLegalMove,
  legalMovesExist,
  newGame,
  placementSquares,
} from "./rules";
import {
  COLORS,
  type Color,
  CornersState,
  FOUR_PLAYER,
  type Move,
  PIECE_IDS,
  type PieceId,
  THREE_PLAYER,
  TWO_PLAYER,
} from "./types";

const VARIANTS = [
  ["4 players", FOUR_PLAYER, ["blue", "yellow", "red", "green"]],
  ["3 players", THREE_PLAYER, ["blue", "yellow", "red"]],
  ["2 players", TWO_PLAYER, ["blue", "yellow"]],
] as const;

describe.each(VARIANTS)("newGame with %s", (_, variant, colors) => {
  const game = newGame(variant);

  it("is a valid state", () => {
    expect(CornersState.parse(game)).toEqual(game);
  });

  it("starts with an empty 20x20 board", () => {
    expect(game.board).toHaveLength(20 * 20);
    expect(game.board.every((cell) => cell === 0)).toBe(true);
  });

  it("gives every color in play all 21 pieces, and the others none", () => {
    expect(Object.keys(game.remaining).sort()).toEqual([...COLORS].sort());
    for (const color of COLORS) {
      const inPlay = (colors as readonly Color[]).includes(color);
      expect(game.remaining[color]).toEqual(inPlay ? [...PIECE_IDS] : []);
      expect(game.lastPlaced[color]).toBeNull();
    }
  });

  it("does not share inventories between colors", () => {
    expect(game.remaining.blue).not.toBe(game.remaining.yellow);
  });

  it("lets blue move first, then the rest clockwise", () => {
    expect(game.turn).toBe("blue");
    expect(game.variant.colors).toEqual(colors);
  });

  it("gives each player one color", () => {
    expect(game.variant.seats).toEqual(colors.map((c) => [c]));
  });

  it("has no moves or passes yet", () => {
    expect(game.passes).toBe(0);
    expect(game.lastMove).toBeNull();
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

/** Every board corner is taken by colors other than blue, so blue can't start. */
const cornersTaken: Partial<Record<Color, Squares>> = {
  yellow: [[0, 0]],
  red: [[19, 19]],
  green: [
    [19, 0],
    [0, 19],
  ],
};

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
    ] as const)("allows %s to cover a board corner", (color, move) => {
      expect(checkMove(game({}, color), color, move)).toEqual({ ok: true });
    });

    it.each([
      [0, 0],
      [19, 0],
      [19, 19],
      [0, 19],
    ])("allows any color to start in corner (%i, %i)", (x, y) => {
      expect(checkMove(game({}, "yellow"), "yellow", place("I1", x, y))).toEqual({ ok: true });
    });

    it("allows a first piece in the corner another color used to start from", () => {
      // (0, 0) used to be blue's fixed corner; red may take it.
      expect(checkMove(game({}, "red"), "red", place("O4", 0, 0))).toEqual({ ok: true });
    });

    it("rejects a first piece that covers no corner", () => {
      expect(checkMove(game(), "blue", place("I1", 1, 1))).toEqual({
        ok: false,
        reason: "misses-corner",
      });
      expect(checkMove(game(), "blue", place("I5", 5, 0))).toEqual({
        ok: false,
        reason: "misses-corner",
      });
    });

    it("rejects a corner another color has taken", () => {
      expect(checkMove(game({ yellow: [[19, 0]] }), "blue", place("I1", 19, 0))).toEqual({
        ok: false,
        reason: "occupied",
      });
    });

    it("allows another empty corner when some are taken", () => {
      const state = game({ yellow: [[19, 0]], red: [[0, 0]] });
      expect(isLegalMove(state, "blue", place("I1", 0, 19))).toBe(true);
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
    it("rejects a pass while the color can still place", () => {
      expect(checkMove(game(blueStarted), "blue", { kind: "pass" })).toEqual({
        ok: false,
        reason: "can-still-place",
      });
    });

    it("allows a pass when the color can't place", () => {
      expect(checkMove(game(cornersTaken), "blue", { kind: "pass" })).toEqual({ ok: true });
    });

    it("rejects a pass out of turn", () => {
      expect(checkMove(game(), "green", { kind: "pass" })).toEqual({
        ok: false,
        reason: "not-your-turn",
      });
    });
  });
});

/** Every square of `color` on the board, sorted by y then x. */
const squaresOf = (state: CornersState, color: Color): Squares =>
  state.board.flatMap(
    (cell, i): Squares =>
      cell === COLORS.indexOf(color) + 1 ? [[i % 20, Math.floor(i / 20)]] : [],
  );

/** Fills every empty square with `filler`, except those listed. */
const fillExcept = (state: CornersState, filler: Color, keep: Squares = []) => {
  for (let i = 0; i < state.board.length; i++) {
    const free = keep.some(([x, y]) => y * 20 + x === i);
    if (state.board[i] === 0 && !free) state.board[i] = COLORS.indexOf(filler) + 1;
  }
  return state;
};

describe("boardCorners", () => {
  it("is the four corner squares, sorted by y then x", () => {
    expect(boardCorners(20)).toEqual([
      [0, 0],
      [19, 0],
      [0, 19],
      [19, 19],
    ]);
  });

  it("has one square on a 1x1 board", () => {
    expect(boardCorners(1)).toEqual([[0, 0]]);
  });
});

describe("cornerCandidates", () => {
  it("is every board corner before the first piece", () => {
    for (const color of COLORS) expect(cornerCandidates(game(), color)).toEqual(boardCorners(20));
  });

  it("leaves out taken corners before the first piece", () => {
    expect(cornerCandidates(game({ yellow: [[0, 0]], red: [[19, 19]] }), "blue")).toEqual([
      [19, 0],
      [0, 19],
    ]);
  });

  it("is empty before the first piece if every corner is taken", () => {
    expect(cornerCandidates(game(cornersTaken), "blue")).toEqual([]);
  });

  it("is the empty diagonals without an own edge after a piece", () => {
    // Blue's V3 at (0,0),(0,1),(1,1): diagonals (1,0) and (0,2) touch its edges.
    const state = game({
      blue: [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
    });
    expect(cornerCandidates(state, "blue")).toEqual([
      [2, 0],
      [2, 2],
    ]);
  });

  it("leaves out squares other colors have taken", () => {
    const state = game({ blue: [[0, 0]], yellow: [[1, 1]] });
    expect(cornerCandidates(state, "blue")).toEqual([]);
  });

  it("stays on the board", () => {
    expect(cornerCandidates(game({ red: [[19, 19]] }), "red")).toEqual([[18, 18]]);
  });
});

describe("legalMovesExist", () => {
  it("is true for every color at the start", () => {
    for (const color of COLORS) expect(legalMovesExist(game(), color)).toBe(true);
  });

  it("doesn't depend on whose turn it is", () => {
    expect(legalMovesExist(game({}, "red"), "blue")).toBe(true);
  });

  it("is true before the first piece while any corner is empty", () => {
    expect(legalMovesExist(game({ yellow: [[0, 0]], red: [[19, 19]] }), "blue")).toBe(true);
  });

  it("is false before the first piece when every corner is taken", () => {
    expect(legalMovesExist(game(cornersTaken), "blue")).toBe(false);
  });

  it("is false with no pieces left", () => {
    const state = game(blueStarted);
    state.remaining.blue = [];
    expect(legalMovesExist(state, "blue")).toBe(false);
  });

  it("is false when no remaining piece fits a candidate", () => {
    // Only (1,1) is free next to blue, and blue has only a domino left.
    const state = fillExcept(game(blueStarted), "yellow", [[1, 1]]);
    state.remaining.blue = ["I2"];
    expect(legalMovesExist(state, "blue")).toBe(false);
    state.remaining.blue = ["I2", "I1"];
    expect(legalMovesExist(state, "blue")).toBe(true);
  });
});

describe("applyMove", () => {
  it("places the piece and passes the turn on", () => {
    const after = applyMove(newGame(FOUR_PLAYER), place("V3", 0, 0));
    expect(squaresOf(after, "blue")).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
    ]);
    expect(after.remaining.blue).toEqual(PIECE_IDS.filter((id) => id !== "V3"));
    expect(after.remaining.yellow).toEqual([...PIECE_IDS]);
    expect(after.lastPlaced).toEqual({ blue: "V3", yellow: null, red: null, green: null });
    expect(after.lastMove).toEqual({ color: "blue", move: place("V3", 0, 0) });
    expect(after.turn).toBe("yellow");
    expect(after.passes).toBe(0);
    expect(CornersState.parse(after)).toEqual(after);
  });

  it.each([
    [TWO_PLAYER, ["yellow", "blue"]],
    [THREE_PLAYER, ["yellow", "red", "blue"]],
    [FOUR_PLAYER, ["yellow", "red", "green", "blue"]],
  ])("only gives turns to the colors in play", (variant, expected) => {
    let state = newGame(variant);
    const firsts = [place("I1", 0, 0), place("I1", 19, 0), place("I1", 19, 19), place("I1", 0, 19)];
    const turns: Color[] = [];
    for (const move of firsts.slice(0, variant.colors.length)) {
      state = applyMove(state, move);
      turns.push(state.turn);
    }
    expect(turns).toEqual(expected);
    expect(state.passes).toBe(0);
  });

  it("doesn't mutate its input", () => {
    const state = game(blueStarted);
    const before = structuredClone(state);
    applyMove(state, place("I2", 1, 1));
    expect(state).toEqual(before);
  });

  it("throws on an illegal move, with the reason", () => {
    expect(() => applyMove(game(), place("I1", 5, 5))).toThrow(/misses-corner/);
    expect(() => applyMove(game(blueStarted), { kind: "pass" })).toThrow(/can-still-place/);
  });

  it("skips a blocked color", () => {
    // Every corner is taken before yellow's first piece, so yellow can never start.
    const state = game({
      blue: [[0, 0]],
      red: [
        [19, 0],
        [19, 19],
      ],
      green: [[0, 19]],
    });
    const after = applyMove(state, place("I1", 1, 1));
    expect(after.turn).toBe("red");
    expect(after.passes).toBe(1);
  });

  it("wraps around to the mover when everyone else is blocked", () => {
    const state = game({ green: [[0, 19]] }, "green");
    state.remaining = { ...state.remaining, blue: [], yellow: [], red: [] };
    const after = applyMove(state, place("I1", 1, 18));
    expect(after.turn).toBe("green");
    expect(after.passes).toBe(3);
  });

  it("resets the passes on a placement", () => {
    const state = { ...game(blueStarted), passes: 2 };
    expect(applyMove(state, place("I2", 1, 1)).passes).toBe(0);
  });

  it("keeps lastPlaced on a pass", () => {
    const state: CornersState = {
      ...game(cornersTaken),
      lastPlaced: { blue: "I1", yellow: "I2", red: null, green: null },
    };
    const after = applyMove(state, { kind: "pass" });
    expect(after.lastPlaced).toEqual(state.lastPlaced);
    expect(after.lastMove).toEqual({ color: "blue", move: { kind: "pass" } });
    expect(after.turn).toBe("yellow");
    expect(after.passes).toBe(1);
  });
});

describe("forfeitTurn", () => {
  it("moves the turn on without placing anything", () => {
    const state = applyMove(newGame(FOUR_PLAYER), place("I1", 0, 0));
    const after = forfeitTurn(state);
    expect(after.turn).toBe("red");
    expect(after.board).toEqual(state.board);
    expect(after.remaining).toEqual(state.remaining);
    expect(after.lastMove).toEqual(state.lastMove);
    expect(after.passes).toBe(0);
  });

  it("isn't a pass: the color plays again on its next turn", () => {
    let state = newGame(TWO_PLAYER);
    state = forfeitTurn(state);
    expect(state.turn).toBe("yellow");
    state = applyMove(state, place("I1", 19, 0));
    expect(state.turn).toBe("blue");
  });

  it("skips blocked colors like a move does", () => {
    const state = game({
      blue: [[0, 0]],
      red: [
        [19, 0],
        [19, 19],
      ],
      green: [[0, 19]],
    });
    const after = forfeitTurn(state);
    expect(after.turn).toBe("red");
    expect(after.passes).toBe(1);
  });

  it("gives the turn back when everyone else is blocked", () => {
    const state = game({ green: [[0, 19]] }, "green");
    state.remaining = { ...state.remaining, blue: [], yellow: [], red: [] };
    expect(forfeitTurn(state).turn).toBe("green");
  });

  it("throws once the game is over", () => {
    const state = newGame(FOUR_PLAYER);
    state.remaining = { blue: [], yellow: [], red: [], green: [] };
    expect(() => forfeitTurn(state)).toThrow(/over/);
  });
});

describe("game end", () => {
  it("isn't over at the start", () => {
    expect(isGameOver(newGame(FOUR_PLAYER))).toBe(false);
  });

  it("ends when every color is blocked", () => {
    // Everything but (1, 1) is taken; blue places its monomino there.
    const state = fillExcept(game(blueStarted), "yellow", [[1, 1]]);
    for (const color of COLORS) state.remaining[color] = color === "blue" ? ["I1"] : ["I2"];
    expect(isGameOver(state)).toBe(false);
    const after = applyMove(state, place("I1", 1, 1));
    expect(isGameOver(after)).toBe(true);
    expect(after.turn).toBe("yellow");
    expect(after.passes).toBe(COLORS.length);
  });

  it.each(VARIANTS)("ends a full %s game played with the first legal move", (_, variant) => {
    let state = newGame(variant);
    let moves = 0;
    while (!isGameOver(state)) {
      const color = state.turn;
      const move = firstLegalMove(state);
      expect(move, `${color} has the turn, so it can move`).not.toBeNull();
      if (!move) break;
      const before = state;
      state = applyMove(state, move);
      moves++;

      expect(state.lastPlaced[color]).toBe(move.pieceId);
      expect(state.remaining[color]).toHaveLength(before.remaining[color].length - 1);
    }

    expect(moves).toBeGreaterThan(20);
    expect(CornersState.parse(state)).toEqual(state);
    for (const color of COLORS.filter((c) => !variant.colors.includes(c))) {
      expect(squaresOf(state, color)).toEqual([]);
      expect(state.lastPlaced[color]).toBeNull();
    }
    for (const color of variant.colors) {
      const placed = PIECE_IDS.filter((id) => !state.remaining[color].includes(id));
      const squares = placed.reduce((sum, id) => sum + (ORIENTATIONS[id][0]?.length ?? 0), 0);
      expect(squaresOf(state, color)).toHaveLength(squares);
      expect(legalMovesExist(state, color)).toBe(false);
    }
  });
});

/** The first legal placement for the color to move, by brute force over the board. */
const firstLegalMove = (state: CornersState): Extract<Move, { kind: "place" }> | null => {
  for (const pieceId of state.remaining[state.turn]) {
    for (let orientation = 0; orientation < ORIENTATIONS[pieceId].length; orientation++) {
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          const move = { kind: "place" as const, pieceId, orientation, x, y };
          if (isLegalMove(state, state.turn, move)) return move;
        }
      }
    }
  }
  return null;
};
