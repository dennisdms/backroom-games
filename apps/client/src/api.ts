import { ApiError, type CreateRoomRequest, CreateRoomResponse, RoomInfo } from "@backroom/shared";

// Calls to the HTTP API. Failures come back as a message to show the player,
// never as a thrown error.

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** A Zod schema, without the client depending on Zod itself. */
interface Schema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

export function createRoom(body: CreateRoomRequest, fetcher: Fetch = fetch) {
  return request(CreateRoomResponse, fetcher, "/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getRoom(code: string, fetcher: Fetch = fetch) {
  return request(RoomInfo, fetcher, `/api/rooms/${encodeURIComponent(code)}`);
}

const messages: Record<string, string> = {
  room_not_found: "There's no room with that code. Check it and try again.",
  invalid_request: "That didn't work. Check what you entered and try again.",
  unknown_game: "That game isn't available.",
  invalid_options: "Those settings aren't available for this game.",
};

/** A readable message for an API error code. */
export function errorMessage(code: string): string {
  return messages[code] ?? "Something went wrong on the server. Try again in a moment.";
}

async function request<T>(
  schema: Schema<T>,
  fetcher: Fetch,
  url: string,
  init?: RequestInit,
): Promise<Result<T>> {
  let response: Response;
  let body: unknown;
  try {
    response = await fetcher(url, init);
    body = await response.json();
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }
  if (!response.ok) {
    const error = ApiError.safeParse(body);
    return { ok: false, error: errorMessage(error.success ? error.data.error : "") };
  }
  const value = schema.safeParse(body);
  return value.success ? { ok: true, value: value.data } : { ok: false, error: errorMessage("") };
}
