export type Route = { name: "landing" } | { name: "room"; code: string };

/** Maps a URL path to a route: `/` is the landing page, `/r/:code` is a room. */
export function parseRoute(pathname: string): Route {
  const match = /^\/r\/([A-Za-z0-9]+)\/?$/.exec(pathname);
  return match?.[1] ? { name: "room", code: match[1].toUpperCase() } : { name: "landing" };
}

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
