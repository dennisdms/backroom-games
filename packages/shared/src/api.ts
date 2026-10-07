import { z } from "zod";
import { GameOptions, RoomSettings } from "./games";

// HTTP API under /api, shared by client and server. Errors are JSON
// `{ error }` with a snake_case code, e.g. `{ "error": "room_not_found" }`.

export const MAX_NAME_LENGTH = 24;

/** `POST /api/rooms`: create a room and join it as host. */
export const CreateRoomRequest = z.object({
  /** Game id, e.g. "corners". */
  game: z.string().min(1),
  /** The creator's display name. Surrounding whitespace is trimmed. */
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  /** Settings every room has. Missing ones get their default. */
  settings: RoomSettings.prefault({}),
  /**
   * The game's own options (`GameInfo.options`). The server checks them
   * against the game and fills in defaults.
   */
  options: GameOptions.optional(),
});
/** What a client sends; settings and options it leaves out get their defaults. */
export type CreateRoomRequest = z.input<typeof CreateRoomRequest>;

/** 201 response to `POST /api/rooms`. */
export const CreateRoomResponse = z.object({
  code: z.string(),
  /** Secret for the creator's seat. Send it in `hello` to join over the WebSocket. */
  playerToken: z.string(),
});
export type CreateRoomResponse = z.infer<typeof CreateRoomResponse>;

/** 200 response to `GET /api/rooms/:code`. Public, so it holds no tokens. */
export const RoomInfo = z.object({
  code: z.string(),
  game: z.string(),
  phase: z.enum(["lobby", "playing", "finished"]),
  playerCount: z.int().min(0),
  maxPlayers: z.int().min(1),
});
export type RoomInfo = z.infer<typeof RoomInfo>;

/** Body of every 4xx/5xx API response. */
export const ApiError = z.object({ error: z.string() });
export type ApiError = z.infer<typeof ApiError>;
