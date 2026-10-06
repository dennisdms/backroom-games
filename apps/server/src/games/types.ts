// The plug-in point for games. Rooms and the WebSocket only ever talk to a
// GameModule, so they stay the same for every game.
import type { Player, Ranking, RoomState } from "@backroom/shared";

/** Games identify players by their room seat (0-based). */
export type PlayerId = number;

export type MoveCheck = { ok: true } | { ok: false; reason: string };

/** A game's state as clients receive it in `RoomState.game`. */
export type GameView = NonNullable<RoomState["game"]>;

/** The colors a player plays as, shown next to their name. */
export type PlayerColors = Player["colors"];

/**
 * One game. Every function is pure: the server stores the returned state as
 * the room's opaque `game` and passes it back in.
 *
 * Declared with method syntax so a `GameModule<CornersState, Move>` fits the
 * registry's `GameModule`; the registry's callers only pass back states the
 * same module made and moves that went through its `parseMove`.
 */
export interface GameModule<State = unknown, Move = unknown> {
  id: string;
  /** The player counts a game can start with, ascending. */
  playerCounts: readonly number[];
  /** A new game for these players, seats 0..n-1. Throws for an unsupported count. */
  init(players: PlayerId[], options: unknown): State;
  /** The move as this game's type, or null if it isn't one. */
  parseMove(input: unknown): Move | null;
  validate(state: State, player: PlayerId, move: Move): MoveCheck;
  /** The state after `player` makes `move`. Throws if `validate` would reject it. */
  apply(state: State, player: PlayerId, move: Move): State;
  isOver(state: State): boolean;
  /** The standings so far; final once `isOver`. */
  result(state: State): Ranking;
  /** What `player` may see, for games with hidden information. */
  view(state: State, player: PlayerId): GameView;
  /** The colors `player` plays as in this game. */
  colors(state: State, player: PlayerId): PlayerColors;
}

/** The most players a game seats, which is how many seats its rooms get. */
export const maxPlayers = (game: GameModule): number => Math.max(...game.playerCounts);
