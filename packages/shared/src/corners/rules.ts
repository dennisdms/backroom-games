// Corners rules: pure functions with no I/O, used by the server to enforce
// moves and by the client to preview them.

import { ORIENTATIONS, type Shape, type Square } from "./pieces";
import {
  type Cell,
  COLORS,
  type Color,
  type CornersState,
  type Move,
  PIECE_IDS,
  type Placement,
  type Variant,
} from "./types";

/**
 * A game before the first move: an empty board, every piece in hand, and the
 * first color in the variant's turn order to move. Seating (who controls which
 * colors) comes from `variant.seats`, so 2 and 4 players differ only by variant.
 */
export const newGame = (variant: Variant): CornersState => ({
  variant,
  board: Array.from({ length: variant.size * variant.size }, () => 0),
  remaining: {
    blue: [...PIECE_IDS],
    yellow: [...PIECE_IDS],
    red: [...PIECE_IDS],
    green: [...PIECE_IDS],
  },
  turn: firstColor(variant),
  passes: 0,
  lastMove: null,
  lastPlaced: { blue: null, yellow: null, red: null, green: null },
});

const firstColor = (variant: Variant) => {
  const [first] = variant.colors;
  if (first === undefined) throw new Error("A variant needs at least one color");
  return first;
};

/** Why a move is illegal, in the order the checks run. */
export type IllegalReason =
  /** It isn't this color's turn. */
  | "not-your-turn"
  /** The color has already placed this piece. */
  | "piece-used"
  /** The orientation index doesn't exist for this piece. */
  | "unknown-orientation"
  /** A square falls outside the board. */
  | "off-board"
  /** A square is already taken. */
  | "occupied"
  /** The color's first piece doesn't cover its starting corner. */
  | "misses-corner"
  /** A later piece doesn't touch its own color corner to corner. */
  | "no-corner-contact"
  /** A square shares an edge with the same color. */
  | "touches-own-edge"
  /** A pass while the color can still place a piece. */
  | "can-still-place";

export type MoveCheck = { ok: true } | { ok: false; reason: IllegalReason };

/** The board value for a color's squares (see `Cell`). */
export const cellOf = (color: Color): Cell => COLORS.indexOf(color) + 1;

/**
 * The board squares a placement covers, or null if its orientation doesn't
 * exist. Squares may fall off the board; `checkMove` rejects those.
 */
export const placementSquares = (placement: Placement): Square[] | null => {
  const shape: Shape | undefined = ORIENTATIONS[placement.pieceId][placement.orientation];
  return shape?.map(([dx, dy]) => [placement.x + dx, placement.y + dy]) ?? null;
};

const EDGES: Square[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONALS: Square[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Whether `color` may make `move` now, and if not, why. A pass is only legal
 * when the color can't place any piece: as in the board game, a color that can
 * move must. `applyMove` skips blocked colors, so in play a pass is rejected.
 */
export const checkMove = (state: CornersState, color: Color, move: Move): MoveCheck => {
  if (state.turn !== color) return illegal("not-your-turn");
  if (move.kind === "pass") {
    return legalMovesExist(state, color) ? illegal("can-still-place") : { ok: true };
  }
  if (!state.remaining[color].includes(move.pieceId)) return illegal("piece-used");

  const squares = placementSquares(move);
  if (!squares) return illegal("unknown-orientation");

  const { size, corners } = state.variant;
  const at = (x: number, y: number): Cell | null =>
    x >= 0 && y >= 0 && x < size && y < size ? (state.board[y * size + x] ?? null) : null;

  if (squares.some(([x, y]) => at(x, y) === null)) return illegal("off-board");
  if (squares.some(([x, y]) => at(x, y) !== 0)) return illegal("occupied");

  const own = cellOf(color);
  const touches = (offsets: Square[]) =>
    squares.some(([x, y]) => offsets.some(([dx, dy]) => at(x + dx, y + dy) === own));

  if (!state.board.includes(own)) {
    const [cx, cy] = corners[color];
    return squares.some(([x, y]) => x === cx && y === cy) ? { ok: true } : illegal("misses-corner");
  }
  if (touches(EDGES)) return illegal("touches-own-edge");
  if (!touches(DIAGONALS)) return illegal("no-corner-contact");
  return { ok: true };
};

/** Whether `color` may make `move` now. See `checkMove` for the reason. */
export const isLegalMove = (state: CornersState, color: Color, move: Move): boolean =>
  checkMove(state, color, move).ok;

const illegal = (reason: IllegalReason): MoveCheck => ({ ok: false, reason });

const onBoard = (size: number, x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size;

/**
 * The squares where `color`'s next piece could touch it: empty squares diagonal
 * to one of its squares with no edge against it, sorted by y then x. Before its
 * first piece, its starting corner if that's still empty, otherwise none. Every
 * legal placement covers at least one of these.
 */
export const cornerCandidates = (state: CornersState, color: Color): Square[] => {
  const { size, corners } = state.variant;
  const own = cellOf(color);
  const isOwn = (x: number, y: number) => onBoard(size, x, y) && state.board[y * size + x] === own;

  if (!state.board.includes(own)) {
    const [cx, cy] = corners[color];
    return state.board[cy * size + cx] === 0 ? [[cx, cy]] : [];
  }

  const candidates: Square[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (state.board[y * size + x] !== 0) continue;
      if (EDGES.some(([dx, dy]) => isOwn(x + dx, y + dy))) continue;
      if (DIAGONALS.some(([dx, dy]) => isOwn(x + dx, y + dy))) candidates.push([x, y]);
    }
  }
  return candidates;
};

/**
 * Whether `color` could place any piece if it were its turn. Only tries each
 * remaining orientation anchored so one of its squares lands on a corner
 * candidate, and stops at the first legal placement.
 */
export const legalMovesExist = (state: CornersState, color: Color): boolean => {
  const candidates = cornerCandidates(state, color);
  if (candidates.length === 0) return false;
  const asTurn = state.turn === color ? state : { ...state, turn: color };

  for (const pieceId of state.remaining[color]) {
    const orientations = ORIENTATIONS[pieceId];
    for (let orientation = 0; orientation < orientations.length; orientation++) {
      for (const [dx, dy] of orientations[orientation] ?? []) {
        for (const [cx, cy] of candidates) {
          const x = cx - dx;
          const y = cy - dy;
          if (x < 0 || y < 0) continue;
          const move: Move = { kind: "place", pieceId, orientation, x, y };
          if (checkMove(asTurn, color, move).ok) return true;
        }
      }
    }
  }
  return false;
};

/**
 * The game is over when no color can place a piece. Being blocked is permanent
 * (the board only fills up), so this never turns back to false.
 */
export const isGameOver = (state: CornersState): boolean =>
  state.variant.colors.every((color) => !legalMovesExist(state, color));

/**
 * The state after the color whose turn it is makes `move`. Throws if the move
 * is illegal; call `checkMove` first for the reason. A placement covers the
 * board, uses up the piece and records it in `lastPlaced`. The turn then goes
 * to the next color in `variant.colors` that can still place, and each color
 * skipped on the way counts as a pass in `passes` (a placement resets it). Once
 * no color can place, `isGameOver` is true and `turn` is just the next color.
 */
export const applyMove = (state: CornersState, move: Move): CornersState => {
  const color = state.turn;
  const check = checkMove(state, color, move);
  if (!check.ok) throw new Error(`Illegal move for ${color}: ${check.reason}`);

  let next: CornersState = { ...state, lastMove: { color, move } };
  if (move.kind === "place") {
    const board = [...state.board];
    for (const [x, y] of placementSquares(move) ?? []) {
      board[y * state.variant.size + x] = cellOf(color);
    }
    next = {
      ...next,
      board,
      remaining: {
        ...state.remaining,
        [color]: state.remaining[color].filter((id) => id !== move.pieceId),
      },
      lastPlaced: { ...state.lastPlaced, [color]: move.pieceId },
      passes: 0,
    };
  } else {
    next = { ...next, passes: state.passes + 1 };
  }

  const { colors } = state.variant;
  const start = colors.indexOf(color);
  let passes = next.passes;
  for (let step = 1; step <= colors.length; step++) {
    const candidate = colors[(start + step) % colors.length];
    if (candidate === undefined) break;
    if (legalMovesExist(next, candidate)) return { ...next, turn: candidate, passes };
    passes++;
  }
  return { ...next, turn: colors[(start + 1) % colors.length] ?? color, passes };
};
