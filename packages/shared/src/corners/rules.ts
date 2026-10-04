// Corners rules: pure functions with no I/O, used by the server to enforce
// moves and by the client to preview them.
// TODO: applyMove, legalMovesExist. See #9.

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
  | "touches-own-edge";

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
 * Whether `color` may make `move` now, and if not, why. A pass is legal on the
 * color's turn; whether it may still place a piece instead is #9's concern.
 */
export const checkMove = (state: CornersState, color: Color, move: Move): MoveCheck => {
  if (state.turn !== color) return illegal("not-your-turn");
  if (move.kind === "pass") return { ok: true };
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
