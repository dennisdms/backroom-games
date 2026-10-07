import { z } from "zod";

// Corners data types, shared by the rules, the server and the client. Each is a
// Zod schema so the client can validate the state it receives.

/** The four colors, in turn order. */
export const COLORS = ["blue", "yellow", "red", "green"] as const;
export const Color = z.enum(COLORS);
export type Color = z.infer<typeof Color>;

/** A board square: 0 when empty, otherwise `n` for `COLORS[n - 1]`. */
export const Cell = z.int().min(0).max(COLORS.length);
export type Cell = z.infer<typeof Cell>;

/**
 * The board, row-major (`board[y * size + x]`). A plain array rather than a
 * `Uint8Array`, which doesn't survive `JSON.stringify`.
 */
export const Board = z.array(Cell);
export type Board = z.infer<typeof Board>;

/** The 21 pieces each color owns, named by shape and square count. */
export const PIECE_IDS = [
  "I1",
  "I2",
  "I3",
  "V3",
  "I4",
  "L4",
  "O4",
  "T4",
  "Z4",
  "F5",
  "I5",
  "L5",
  "N5",
  "P5",
  "T5",
  "U5",
  "V5",
  "W5",
  "X5",
  "Y5",
  "Z5",
] as const;
export const PieceId = z.enum(PIECE_IDS);
export type PieceId = z.infer<typeof PieceId>;

/** An index into a piece's unique orientations (rotations and mirrors). */
export const Orientation = z.int().min(0);
export type Orientation = z.infer<typeof Orientation>;

/** A piece in one orientation, with its normalized origin at (x, y). */
export const Placement = z.object({
  pieceId: PieceId,
  orientation: Orientation,
  x: z.int().min(0),
  y: z.int().min(0),
});
export type Placement = z.infer<typeof Placement>;

export const Move = z.discriminatedUnion("kind", [
  Placement.extend({ kind: z.literal("place") }),
  z.object({ kind: z.literal("pass") }),
]);
export type Move = z.infer<typeof Move>;

/** The board and seating for one way of playing. */
export const Variant = z.object({
  size: z.int().min(1),
  /** The colors in play, in turn order. The others take no turns and don't score. */
  colors: z.array(Color),
  /** The colors each seat controls, by seat index. */
  seats: z.array(z.array(Color)),
});
export type Variant = z.infer<typeof Variant>;

/** One color per player: the first `players` colors in turn order. */
const onePerPlayer = (players: number): Variant => {
  const colors = COLORS.slice(0, players);
  return { size: 20, colors, seats: colors.map((c) => [c]) };
};

export const TWO_PLAYER: Variant = onePerPlayer(2);
export const THREE_PLAYER: Variant = onePerPlayer(3);
export const FOUR_PLAYER: Variant = onePerPlayer(4);

export const CornersState = z.object({
  variant: Variant,
  board: Board,
  /** Each color's pieces in hand. Always empty for colors not in play. */
  remaining: z.record(Color, z.array(PieceId)),
  turn: Color,
  /** Consecutive passes. */
  passes: z.int().min(0),
  lastMove: z.object({ color: Color, move: Move }).nullable(),
  /**
   * The piece each color placed most recently, or null before its first (and
   * always for colors not in play).
   */
  lastPlaced: z.record(Color, PieceId.nullable()),
});
export type CornersState = z.infer<typeof CornersState>;
