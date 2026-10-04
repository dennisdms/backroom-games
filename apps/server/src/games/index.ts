// Games: the GameModule interface and the Corners adapter, which wraps the
// rules in @backroom/shared. TODO: #13.

/**
 * Stand-in for the GameModule registry: just enough for the rooms API to know
 * which game ids exist and how many seats they have.
 * TODO(#13): replace with the registry of `GameModule`s.
 */
export interface GameInfo {
  maxPlayers: number;
}

const games = new Map<string, GameInfo>([["corners", { maxPlayers: 4 }]]);

/** The game with this id, or undefined if there is none. */
export function findGame(id: string): GameInfo | undefined {
  return games.get(id);
}
