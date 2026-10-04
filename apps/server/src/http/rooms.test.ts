import { CreateRoomResponse, RoomInfo } from "@backroom/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { RoomManager } from "../rooms";
import { InMemoryRoomStore } from "../store";

let app: Awaited<ReturnType<typeof buildApp>>;
let rooms: RoomManager;

beforeEach(async () => {
  rooms = new RoomManager({ store: new InMemoryRoomStore() });
  app = await buildApp({ logLevel: "silent", rooms });
});

afterEach(async () => {
  await app.close();
});

function createRoom(payload: object) {
  return app.inject({ method: "POST", url: "/api/rooms", payload });
}

describe("POST /api/rooms", () => {
  it("creates a room with the creator as host", async () => {
    const res = await createRoom({ game: "corners", name: " Ada " });
    expect(res.statusCode).toBe(201);
    const { code, playerToken } = CreateRoomResponse.parse(res.json());
    const room = await rooms.get(code);
    expect(room).toMatchObject({ gameId: "corners", maxPlayers: 4, phase: "lobby" });
    expect(room?.players).toEqual([{ seat: 0, name: "Ada", token: playerToken }]);
  });

  it.each([
    ["an empty body", {}],
    ["a missing name", { game: "corners" }],
    ["a blank name", { game: "corners", name: "   " }],
    ["a too long name", { game: "corners", name: "x".repeat(25) }],
    ["a non-string game", { game: 1, name: "Ada" }],
  ])("rejects %s", async (_, payload) => {
    const res = await createRoom(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "invalid_request" });
  });

  it("rejects a request without a body", async () => {
    const res = await app.inject({ method: "POST", url: "/api/rooms" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "invalid_request" });
  });

  it("rejects malformed JSON", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      headers: { "content-type": "application/json" },
      payload: "{nope",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "invalid_request" });
  });

  it("rejects unknown games", async () => {
    for (const game of ["chess", "__proto__"]) {
      const res = await createRoom({ game, name: "Ada" });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: "unknown_game" });
    }
  });
});

describe("GET /api/rooms/:code", () => {
  it("describes the room without tokens", async () => {
    const { room, player } = await rooms.create({ gameId: "corners", maxPlayers: 4, name: "Ada" });
    await rooms.join(room.code, { name: "Bob" });

    const res = await app.inject({ method: "GET", url: `/api/rooms/${room.code}` });
    expect(res.statusCode).toBe(200);
    expect(RoomInfo.parse(res.json())).toEqual({
      code: room.code,
      game: "corners",
      phase: "lobby",
      playerCount: 2,
      maxPlayers: 4,
    });
    expect(res.body).not.toContain(player.token);
    expect(res.body).not.toContain("token");
  });

  it("accepts a lowercase code", async () => {
    const { room } = await rooms.create({ gameId: "corners", maxPlayers: 4, name: "Ada" });
    const res = await app.inject({
      method: "GET",
      url: `/api/rooms/${room.code.toLowerCase()}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ code: room.code });
  });

  it("returns 404 for unknown codes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/rooms/ZZZZZ" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "room_not_found" });
  });

  it("finds a room created through the API", async () => {
    const created = CreateRoomResponse.parse(
      (await createRoom({ game: "corners", name: "Ada" })).json(),
    );
    const res = await app.inject({ method: "GET", url: `/api/rooms/${created.code}` });
    expect(res.json()).toMatchObject({ code: created.code, playerCount: 1 });
  });
});
