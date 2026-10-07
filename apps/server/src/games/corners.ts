import {
  applyMove,
  CORNERS,
  type CornersState,
  checkMove,
  FOUR_PLAYER,
  forfeitTurn,
  isGameOver,
  Move,
  newGame,
  rankByScore,
  score,
  THREE_PLAYER,
  TWO_PLAYER,
  type Variant,
} from "@backroom/shared";
import type { GameModule, MoveCheck, PlayerId } from "./types";

// Corners as a GameModule. Only wraps the rules in @backroom/shared: seats map
// to colors through the variant, and the rules do the rest.

const VARIANTS = new Map<number, Variant>([
  [2, TWO_PLAYER],
  [3, THREE_PLAYER],
  [4, FOUR_PLAYER],
]);

const validate = (state: CornersState, player: PlayerId, move: Move): MoveCheck => {
  if (isGameOver(state)) return { ok: false, reason: "game-over" };
  if (!state.variant.seats[player]?.includes(state.turn)) {
    return { ok: false, reason: "not-your-turn" };
  }
  return checkMove(state, state.turn, move);
};

export const corners: GameModule<CornersState, Move> = {
  id: CORNERS.id,
  playerCounts: CORNERS.playerCounts,
  options: CORNERS.options,

  // Hints only change what clients draw, so the rules take no options.
  init(players) {
    const variant = VARIANTS.get(players.length);
    if (!variant || players.some((player, i) => player !== i)) {
      throw new Error(`Corners can't seat players ${JSON.stringify(players)}`);
    }
    return newGame(variant);
  },

  parseMove(input) {
    const move = Move.safeParse(input);
    return move.success ? move.data : null;
  },

  validate,

  apply(state, player, move) {
    const check = validate(state, player, move);
    if (!check.ok) throw new Error(`Illegal move for seat ${player}: ${check.reason}`);
    return applyMove(state, move);
  },

  // Moves on as a move would; the color plays again on its next turn.
  forfeitTurn,

  isOver: isGameOver,

  result: (state) => rankByScore(score(state).bySeat),

  // Nothing is hidden in Corners.
  view: (state) => state,

  colors: (state, player) => state.variant.seats[player] ?? [],
};
