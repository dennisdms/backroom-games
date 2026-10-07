// A room as the server stores it. Game-agnostic: it knows which game it hosts
// and who sits where, but the game's own state is opaque to it.

import type { GameOptions, RoomSettings } from "@backroom/shared";

export type RoomPhase = "lobby" | "playing" | "finished";

export interface RoomPlayer {
  /** 0-based seat, unique within the room. Games identify players by seat. */
  seat: number;
  name: string;
  /** Secret that reattaches this player to their seat. Never send it to other players. */
  token: string;
}

export interface Room {
  code: string;
  /** Which `GameModule` this room plays, e.g. "corners". */
  gameId: string;
  /** Number of seats. Comes from the game; joins beyond it are rejected. */
  maxPlayers: number;
  /** Picked by the host when creating the room, e.g. the turn timer. */
  settings: RoomSettings;
  /** The game's own options, checked and defaulted. Passed to `GameModule.init`. */
  options: GameOptions;
  /**
   * Epoch milliseconds when the player to move runs out of time, or null
   * without a turn timer or outside play.
   */
  turnEndsAt: number | null;
  phase: RoomPhase;
  /** Seat of the host, who created the room. */
  hostSeat: number;
  players: RoomPlayer[];
  /** The game's state while playing or finished, null in the lobby. Owned by the GameModule. */
  game: unknown;
  /** Increases with every change, see `RoomState.version`. */
  version: number;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Epoch milliseconds of the last change. Rooms idle too long are swept. */
  lastActiveAt: number;
}
