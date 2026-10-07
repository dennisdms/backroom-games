import { gameInfo } from "@backroom/shared";

/** The game's display name from the catalog, or its id for a game this client doesn't know. */
export const gameName = (id: string): string => gameInfo(id)?.name ?? id;
