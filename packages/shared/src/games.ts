// The games rooms can play, as the client lists them before any room exists.
// The server's GameModule for each game takes its id and player counts from
// here, so the two can't drift.

export interface GameInfo {
  /** Stable id, sent as `CreateRoomRequest.game` and stored on the room. */
  id: string;
  /** Display name. */
  name: string;
  /** The player counts a game can start with, ascending. */
  playerCounts: readonly number[];
  // Per-game room settings, chosen in the create form, go here once there are any.
}

export const CORNERS = {
  id: "corners",
  name: "Corners",
  playerCounts: [2, 3, 4],
} as const satisfies GameInfo;

/** Every game, in the order the landing page lists them. */
export const GAMES: readonly GameInfo[] = [CORNERS];

/** The catalog entry for `id`, or undefined if there is no such game. */
export const gameInfo = (id: string): GameInfo | undefined => GAMES.find((game) => game.id === id);

/** The player range as shown next to a game: "2–4", or "4" for a single count. */
export function playerRange(counts: readonly number[]): string {
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min === max ? `${min}` : `${min}–${max}`;
}

/** The player range in words, for screen readers: "2 to 4 players". */
export function playerRangeLabel(counts: readonly number[]): string {
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min !== max) return `${min} to ${max} players`;
  return `${min} ${min === 1 ? "player" : "players"}`;
}
