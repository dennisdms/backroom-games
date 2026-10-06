import type { RoomState } from "@backroom/shared";
import type { GameModule } from "../games";
import type { Room } from "../rooms";

/**
 * The room as `seat` sees it: the game through `GameModule.view`, and no
 * tokens.
 */
export function roomStateFor(
  room: Room,
  game: GameModule,
  seat: number,
  online: (seat: number) => boolean,
): RoomState {
  const colorsFrom = colorSource(room, game);
  return {
    code: room.code,
    phase: room.phase,
    players: room.players.map((p) => ({
      seat: p.seat,
      name: p.name,
      online: online(p.seat),
      colors: colorsFrom === null ? [] : game.colors(colorsFrom, p.seat),
    })),
    host: room.hostSeat,
    playerCounts: [...game.playerCounts],
    you: seat,
    game: room.game === null ? null : game.view(room.game, seat),
    version: room.version,
  };
}

/**
 * The game state that decides players' colors. In the lobby, a game as it
 * would start now, so players see their colors before it does; none while the
 * player count can't start.
 */
function colorSource(room: Room, game: GameModule): unknown {
  if (room.game !== null) return room.game;
  if (!game.playerCounts.includes(room.players.length)) return null;
  try {
    return game.init(
      room.players.map((p) => p.seat),
      undefined,
    );
  } catch {
    return null;
  }
}
