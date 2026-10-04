// What the browser remembers between visits: the player token for each room
// (to take back the same seat) and the name the player last used.
//
// Keys look like `backroom:K7QXM:token`. With `?player=N` in the URL they get a
// `pN:` prefix (`backroom:p2:K7QXM:token`), so several tabs in one browser can
// each be a different player while testing.

/** The part of `localStorage` we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PlayerStorage {
  token(code: string): string | null;
  setToken(code: string, token: string): void;
  /** The name given for a room before the server has handed out a token. */
  name(code: string): string | null;
  setName(code: string, name: string): void;
  /** The name last used anywhere, to prefill the name fields. */
  lastName(): string | null;
}

/** The `N` of `?player=N`, or null if it's missing or not a small number. */
export function playerFromSearch(search: string): string | null {
  const player = new URLSearchParams(search).get("player");
  return player !== null && /^\d{1,3}$/.test(player) ? player : null;
}

/**
 * Player storage over `store`, namespaced by `player`. Every access is guarded:
 * storage can be missing or throw (private windows, full quota), and then the
 * player just has to enter their name again.
 */
export function playerStorage(store: KeyValueStore | null, player: string | null): PlayerStorage {
  const prefix = player === null ? "backroom:" : `backroom:p${player}:`;

  const get = (key: string) => {
    try {
      return store?.getItem(prefix + key) ?? null;
    } catch {
      return null;
    }
  };
  const set = (key: string, value: string) => {
    try {
      store?.setItem(prefix + key, value);
    } catch {
      // Not remembered; nothing else to do.
    }
  };

  return {
    token: (code) => get(`${code}:token`),
    setToken: (code, token) => set(`${code}:token`, token),
    name: (code) => get(`${code}:name`),
    setName: (code, name) => {
      set(`${code}:name`, name);
      set("name", name);
    },
    lastName: () => get("name"),
  };
}

/** `localStorage`, or null where even reading the property throws. */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
