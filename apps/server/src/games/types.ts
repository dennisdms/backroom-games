// The plug-in point for games. Rooms and the WebSocket only ever talk to a
// GameModule, so they stay the same for every game.

/** Games identify players by their room seat (0-based). */
export type PlayerId = number;

export type MoveCheck = { ok: true } | { ok: false; reason: string };

/** Best first. Tied players share a rank, and the next rank skips: 1, 1, 3. */
export type Ranking = { player: PlayerId; score: number; rank: number }[];

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
  view(state: State, player: PlayerId): unknown;
}

/** The most players a game seats, which is how many seats its rooms get. */
export const maxPlayers = (game: GameModule): number => Math.max(...game.playerCounts);

/** Ranks players by score, highest first, with ties sharing a rank. */
export const rankByScore = (scores: readonly number[]): Ranking => {
  const sorted = scores
    .map((score, player) => ({ player, score }))
    .sort((a, b) => b.score - a.score || a.player - b.player);
  return sorted.map((entry) => ({
    ...entry,
    rank: 1 + sorted.filter((other) => other.score > entry.score).length,
  }));
};
