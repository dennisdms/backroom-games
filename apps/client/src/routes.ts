import { type GameInfo, gameInfo } from "@backroom/shared";

export type Route =
  | { name: "landing" }
  | { name: "create"; game: GameInfo }
  | { name: "room"; code: string };

/**
 * Maps a URL path to a route: `/` is the landing page, `/new/:game` the form to
 * create a room for a catalog game, `/r/:code` a room. Anything else is the
 * landing page.
 */
export function parseRoute(pathname: string): Route {
  const room = /^\/r\/([A-Za-z0-9]+)\/?$/.exec(pathname);
  if (room?.[1]) return { name: "room", code: room[1].toUpperCase() };
  const create = /^\/new\/([a-z0-9-]+)\/?$/.exec(pathname);
  const game = create?.[1] === undefined ? undefined : gameInfo(create[1]);
  if (game) return { name: "create", game };
  return { name: "landing" };
}

/** The URL path of the form that creates a room for `game`. */
export const createPath = (game: string) => `/new/${game}`;

/** A room code as typed by hand: trimmed and uppercased. Null if it can't be a code. */
export function normalizeCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9]+$/.test(code) ? code : null;
}

/** The URL path of a room. */
export const roomPath = (code: string) => `/r/${code}`;

/** `path` with `?player=N` added when testing as player N, so a tab stays that player. */
export function withPlayer(path: string, player: string | null): string {
  return player === null ? path : `${path}?player=${encodeURIComponent(player)}`;
}
