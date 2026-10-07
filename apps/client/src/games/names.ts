// Display names of the games, by game id. Rooms only know the id.

const names: Record<string, string> = {
  corners: "Corners",
};

/** The game's display name, or its id for a game this client doesn't know. */
export const gameName = (id: string): string => names[id] ?? id;
