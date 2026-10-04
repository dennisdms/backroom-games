import { describe, expect, it } from "vitest";
import { createRoom, errorMessage, getRoom } from "./api";

const respond = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status });

describe("createRoom", () => {
  it("posts the request and parses the response", async () => {
    let sent: { url: string; init: RequestInit | undefined } | undefined;
    const result = await createRoom({ game: "corners", name: "Ada" }, async (url, init) => {
      sent = { url, init };
      return new Response(JSON.stringify({ code: "K7QXM", playerToken: "secret" }), {
        status: 201,
      });
    });
    expect(result).toEqual({ ok: true, value: { code: "K7QXM", playerToken: "secret" } });
    expect(sent?.url).toBe("/api/rooms");
    expect(sent?.init?.method).toBe("POST");
    expect(JSON.parse(String(sent?.init?.body))).toEqual({ game: "corners", name: "Ada" });
  });

  it("turns an API error into a message", async () => {
    const result = await createRoom(
      { game: "corners", name: "Ada" },
      respond(400, { error: "invalid_request" }),
    );
    expect(result).toEqual({ ok: false, error: errorMessage("invalid_request") });
  });
});

describe("getRoom", () => {
  it("parses room info", async () => {
    const info = { code: "K7QXM", game: "corners", phase: "lobby", playerCount: 1, maxPlayers: 4 };
    expect(await getRoom("K7QXM", respond(200, info))).toEqual({ ok: true, value: info });
  });

  it("reports a missing room", async () => {
    const result = await getRoom("NOPE2", respond(404, { error: "room_not_found" }));
    expect(result).toEqual({ ok: false, error: errorMessage("room_not_found") });
  });

  it("reports a network failure or unexpected body", async () => {
    const offline = await getRoom("K7QXM", async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(offline).toMatchObject({ ok: false, error: expect.stringContaining("reach") });
    expect(await getRoom("K7QXM", respond(200, { nope: true }))).toMatchObject({ ok: false });
  });
});
