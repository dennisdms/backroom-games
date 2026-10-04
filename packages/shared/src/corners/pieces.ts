// Corners pieces: the 21 polyominoes each color owns, and their orientations.
import type { PieceId, Placement } from "./types";

/** A square of a piece, relative to the piece's origin. */
export type Square = readonly [x: number, y: number];

/** A piece's squares, normalized: min x and y are 0, sorted by y then x. */
export type Shape = readonly Square[];

/** Each piece in its base orientation (orientation 0, once normalized). */
export const PIECES: Readonly<Record<PieceId, Shape>> = {
  I1: [[0, 0]],
  I2: [
    [0, 0],
    [1, 0],
  ],
  I3: [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  V3: [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  I4: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  L4: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  O4: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  T4: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  Z4: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  F5: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  I5: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  L5: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 3],
  ],
  N5: [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
    [1, 3],
  ],
  P5: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [0, 2],
  ],
  T5: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
    [1, 2],
  ],
  U5: [
    [0, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  V5: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  W5: [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 2],
  ],
  X5: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ],
  Y5: [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, 2],
    [1, 3],
  ],
  Z5: [
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 2],
  ],
};

/** Shifts a shape so its min x and y are 0, and sorts it by y then x. */
export const normalize = (squares: Shape): Shape => {
  const minX = Math.min(...squares.map(([x]) => x));
  const minY = Math.min(...squares.map(([, y]) => y));
  return squares
    .map(([x, y]): Square => [x - minX, y - minY])
    .toSorted(([ax, ay], [bx, by]) => ay - by || ax - bx);
};

const rotate = (squares: Shape): Shape => squares.map(([x, y]) => [-y, x]);
const mirror = (squares: Shape): Shape => squares.map(([x, y]) => [-x, y]);

/**
 * A shape's unique orientations: 4 rotations, each optionally mirrored,
 * normalized and deduplicated. The first is the normalized shape itself.
 */
export const orientationsOf = (shape: Shape): Shape[] => {
  const seen = new Map<string, Shape>();
  for (const start of [shape, mirror(shape)]) {
    let current = start;
    for (let i = 0; i < 4; i++) {
      const normal = normalize(current);
      const key = normal.join(";");
      if (!seen.has(key)) seen.set(key, normal);
      current = rotate(current);
    }
  }
  return [...seen.values()];
};

/**
 * Every piece's unique orientations. A `Placement.orientation` indexes into
 * `ORIENTATIONS[pieceId]`.
 */
export const ORIENTATIONS: Readonly<Record<PieceId, readonly Shape[]>> = Object.fromEntries(
  Object.entries(PIECES).map(([id, shape]) => [id, orientationsOf(shape)]),
) as Record<PieceId, Shape[]>;

/**
 * The board squares a placement covers: its orientation's squares offset by
 * the placement's (x, y). Throws for an orientation the piece doesn't have.
 */
export const placementSquares = ({ pieceId, orientation, x, y }: Placement): Square[] => {
  const shape = ORIENTATIONS[pieceId][orientation];
  if (!shape) throw new RangeError(`${pieceId} has no orientation ${orientation}`);
  return shape.map(([dx, dy]) => [x + dx, y + dy]);
};
