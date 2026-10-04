// A hard-coded game a few moves in, to look at the board before rooms can
// play. Dev-only: the room view shows it under `import.meta.env.DEV`.
import {
  type Color,
  type CornersState,
  cellOf,
  FOUR_PLAYER,
  newGame,
  type Placement,
  placementSquares,
} from "@backroom/shared";

const moves: [Color, Placement][] = [
  ["blue", { pieceId: "L5", orientation: 0, x: 0, y: 0 }],
  // Yellow passed, so its corner is still empty and shows its start marker.
  ["red", { pieceId: "Z4", orientation: 0, x: 17, y: 18 }],
  ["green", { pieceId: "V3", orientation: 0, x: 0, y: 18 }],
  ["blue", { pieceId: "I3", orientation: 0, x: 2, y: 4 }],
];

export const exampleState = (): CornersState => {
  const state = newGame(FOUR_PLAYER);
  const { size } = state.variant;
  for (const [color, placement] of moves) {
    for (const [x, y] of placementSquares(placement) ?? []) {
      state.board[y * size + x] = cellOf(color);
    }
    state.remaining[color] = state.remaining[color].filter((id) => id !== placement.pieceId);
    state.lastPlaced[color] = placement.pieceId;
    state.lastMove = { color, move: { kind: "place", ...placement } };
  }
  state.turn = "yellow";
  return state;
};
