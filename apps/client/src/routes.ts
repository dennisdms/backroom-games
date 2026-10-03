export type Route = { name: "landing" } | { name: "room"; code: string };

/** Maps a URL path to a route: `/` is the landing page, `/r/:code` is a room. */
export function parseRoute(pathname: string): Route {
  const match = /^\/r\/([A-Za-z0-9]+)\/?$/.exec(pathname);
  return match?.[1] ? { name: "room", code: match[1].toUpperCase() } : { name: "landing" };
}
