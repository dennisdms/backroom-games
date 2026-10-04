// Corners scoring: -1 per unplaced square, +15 for placing every piece,
// +5 more if the last piece placed was the monomino.

import { PIECES } from "./pieces";
import { COLORS, type Color, type CornersState, type PieceId } from "./types";

const ALL_PLACED_BONUS = 15;
const MONOMINO_BONUS = 5;
const MONOMINO: PieceId = "I1";

export type Score = {
  /** Each color's score. */
  byColor: Record<Color, number>;
  /** Each seat's score, by seat index: the sum of the colors it controls. */
  bySeat: number[];
};

const colorScore = (state: CornersState, color: Color): number => {
  const remaining = state.remaining[color];
  if (remaining.length > 0) {
    return -remaining.reduce((sum, id) => sum + PIECES[id].length, 0);
  }
  return ALL_PLACED_BONUS + (state.lastPlaced[color] === MONOMINO ? MONOMINO_BONUS : 0);
};

/** Scores a game, per color and per seat. Valid at any point, not just the end. */
export const score = (state: CornersState): Score => {
  const byColor = Object.fromEntries(
    COLORS.map((color) => [color, colorScore(state, color)]),
  ) as Record<Color, number>;
  const bySeat = state.variant.seats.map((colors) =>
    colors.reduce((sum, color) => sum + byColor[color], 0),
  );
  return { byColor, bySeat };
};
