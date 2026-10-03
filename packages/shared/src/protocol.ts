import { z } from "zod";
import { Color, CornersState, Placement } from "./corners/types";

// WebSocket messages, shared by client and server. Every message is JSON with
// a `type` discriminator. To add a message, add its schema to the matching
// union below; both sides then get the type and the runtime validation.

const Seat = z.int().min(0);

export const Player = z.object({
  seat: Seat,
  name: z.string(),
  online: z.boolean(),
  colors: z.array(Color),
});
export type Player = z.infer<typeof Player>;

/** Everything a client needs to draw a room. The server always sends it whole. */
export const RoomState = z.object({
  code: z.string(),
  phase: z.enum(["lobby", "playing", "finished"]),
  players: z.array(Player),
  /** The receiving player's seat. */
  you: Seat,
  /** Null in the lobby. */
  game: CornersState.nullable(),
  /** Increases with every change, so clients can drop stale states. */
  version: z.int().min(0),
});
export type RoomState = z.infer<typeof RoomState>;

export const ClientMessage = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hello"),
    code: z.string(),
    /** From an earlier `welcome`, to take back the same seat. */
    token: z.string().optional(),
    name: z.string(),
  }),
  z.object({ type: z.literal("startGame") }),
  Placement.extend({ type: z.literal("placePiece") }),
  z.object({ type: z.literal("pass") }),
  z.object({ type: z.literal("rematch") }),
  z.object({ type: z.literal("ping") }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export const ServerMessage = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("welcome"),
    you: Seat,
    /** Send back in `hello` to reconnect to this seat. */
    token: z.string(),
    room: RoomState,
  }),
  z.object({ type: z.literal("roomState"), room: RoomState }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
  z.object({ type: z.literal("playerPresence"), seat: Seat, online: z.boolean() }),
  z.object({ type: z.literal("serverRestarting") }),
  z.object({ type: z.literal("pong") }),
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

/** Parses a raw WebSocket frame. Returns null for invalid JSON or unknown messages. */
export function parseClientMessage(raw: string): ClientMessage | null {
  return parseJson(raw, ClientMessage);
}

/** Parses a raw WebSocket frame. Returns null for invalid JSON or unknown messages. */
export function parseServerMessage(raw: string): ServerMessage | null {
  return parseJson(raw, ServerMessage);
}

function parseJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
