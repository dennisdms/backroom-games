// Corners rules: pure functions with no I/O, used by the server to enforce
// moves and by the client to preview them.
// TODO: isLegalMove, applyMove, legalMovesExist. See #8 and #9.

import { type CornersState, PIECE_IDS, type Variant } from "./types";

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
