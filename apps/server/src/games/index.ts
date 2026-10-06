// Games: the GameModule interface and the registry of games rooms can play.
import { corners } from "./corners";
import type { GameModule } from "./types";

export { corners } from "./corners";
export {
  type GameModule,
  type MoveCheck,
  maxPlayers,
  type PlayerId,
  type Ranking,
  rankByScore,
} from "./types";

const games = new Map<string, GameModule>([[corners.id, corners]]);

/** The game with this id, or undefined if there is none. */
export function findGame(id: string): GameModule | undefined {
  return games.get(id);
}
