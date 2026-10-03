import { z } from "zod";

// WebSocket messages, shared by client and server. Every message is JSON with
// a `type` discriminator. To add a message, add its schema to the matching
// union below; both sides then get the type and the runtime validation.
// The planned messages are sketched in the research notes (§1.4).

export const ClientMessage = z.discriminatedUnion("type", [z.object({ type: z.literal("ping") })]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export const ServerMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pong") }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
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
