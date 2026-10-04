import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryRoomStore } from "../store/memory";
import { ROOM_IDLE_MS, RoomManager } from "./manager";

const HOUR = 60 * 60 * 1000;

function setup({ codes }: { codes?: string[] } = {}) {
  const store = new InMemoryRoomStore();
  let time = 1_000_000;
  const clock = {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
  let i = 0;
  const newCode = codes ? () => codes[i++ % codes.length] ?? "" : undefined;
  const rooms = new RoomManager({ store, now: clock.now, ...(newCode && { newCode }) });
  return { store, clock, rooms };
}

function expectOk<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
  return result as Extract<T, { ok: true }>;
}

describe("RoomManager.create", () => {
  it("puts the creator in seat 0 as host", async () => {
    const { rooms } = setup();
    const { room, player } = await rooms.create({ gameId: "stub", maxPlayers: 4, name: " Ada " });
    expect(player).toMatchObject({ seat: 0, name: "Ada" });
    expect(player.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(room).toMatchObject({ gameId: "stub", maxPlayers: 4, phase: "lobby", hostSeat: 0 });
    expect(room.game).toBeNull();
    expect(await rooms.get(room.code)).toEqual(room);
  });

  it("picks another code when one is taken", async () => {
    const { rooms } = setup({ codes: ["AAAAA", "AAAAA", "BBBBB"] });
    const first = await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });
    const second = await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Bob" });
    expect(first.room.code).toBe("AAAAA");
    expect(second.room.code).toBe("BBBBB");
  });

  it("gives up when every code is taken", async () => {
    const { rooms } = setup({ codes: ["AAAAA"] });
    await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });
    await expect(rooms.create({ gameId: "stub", maxPlayers: 2, name: "Bob" })).rejects.toThrow(
      /room code/,
    );
  });
});

describe("RoomManager.join", () => {
  it("seats new players in order with their own tokens", async () => {
    const { rooms } = setup();
    const { room, player: host } = await rooms.create({
      gameId: "stub",
      maxPlayers: 4,
      name: "Ada",
    });
    const bob = expectOk(await rooms.join(room.code, { name: "Bob" }));
    const cy = expectOk(await rooms.join(room.code, { name: "Cy" }));
    expect(bob.player.seat).toBe(1);
    expect(cy.player.seat).toBe(2);
    expect(bob.rejoined).toBe(false);
    expect(new Set([host.token, bob.player.token, cy.player.token]).size).toBe(3);
    expect(cy.room.players.map((p) => p.name)).toEqual(["Ada", "Bob", "Cy"]);
    expect(cy.room.version).toBe(2);
  });

  it("gives a player their seat back for their token", async () => {
    const { rooms } = setup();
    const { room } = await rooms.create({ gameId: "stub", maxPlayers: 4, name: "Ada" });
    const bob = expectOk(await rooms.join(room.code, { name: "Bob" }));
    const again = expectOk(await rooms.join(room.code, { name: "Bob", token: bob.player.token }));
    expect(again.rejoined).toBe(true);
    expect(again.player).toEqual(bob.player);
    expect(again.room.players).toHaveLength(2);
  });

  it("lets a player rejoin after the game started, but no one new", async () => {
    const { rooms } = setup();
    const { room, player: host } = await rooms.create({
      gameId: "stub",
      maxPlayers: 4,
      name: "Ada",
    });
    await rooms.update(room.code, (r) => {
      r.phase = "playing";
    });
    expect(await rooms.join(room.code, { name: "Bob" })).toEqual({
      ok: false,
      error: "game_in_progress",
    });
    expect(
      expectOk(await rooms.join(room.code, { name: "Ada", token: host.token })).player,
    ).toEqual(host);
  });

  it("treats an unknown token as a new player", async () => {
    const { rooms } = setup();
    const { room } = await rooms.create({ gameId: "stub", maxPlayers: 4, name: "Ada" });
    const joined = expectOk(await rooms.join(room.code, { name: "Bob", token: "stale" }));
    expect(joined.rejoined).toBe(false);
    expect(joined.player.seat).toBe(1);
    expect(joined.player.token).not.toBe("stale");
  });

  it("rejects joins to a full room", async () => {
    const { rooms } = setup();
    const { room } = await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });
    expectOk(await rooms.join(room.code, { name: "Bob" }));
    expect(await rooms.join(room.code, { name: "Cy" })).toEqual({ ok: false, error: "room_full" });
    expect((await rooms.get(room.code))?.players).toHaveLength(2);
  });

  it("doesn't give one seat to two concurrent joins", async () => {
    const { rooms } = setup();
    const { room } = await rooms.create({ gameId: "stub", maxPlayers: 3, name: "Ada" });
    const results = await Promise.all(
      ["Bob", "Cy", "Di"].map((name) => rooms.join(room.code, { name })),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: "room_full" }]);
    expect((await rooms.get(room.code))?.players.map((p) => p.seat)).toEqual([0, 1, 2]);
  });

  it("rejects unknown codes", async () => {
    const { rooms } = setup();
    expect(await rooms.join("ZZZZZ", { name: "Bob" })).toEqual({
      ok: false,
      error: "room_not_found",
    });
  });
});

describe("RoomManager.update", () => {
  it("saves the change and bumps the version", async () => {
    const { rooms } = setup();
    const { room } = await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });
    const updated = await rooms.update(room.code, (r) => {
      r.game = { turn: 1 };
    });
    expect(updated?.version).toBe(1);
    expect(await rooms.get(room.code)).toMatchObject({ game: { turn: 1 }, version: 1 });
  });

  it("saves nothing when the change throws", async () => {
    const { rooms } = setup();
    const { room } = await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });
    await expect(
      rooms.update(room.code, (r) => {
        r.phase = "playing";
        throw new Error("illegal");
      }),
    ).rejects.toThrow("illegal");
    expect(await rooms.get(room.code)).toEqual(room);
  });

  it("returns undefined for unknown codes", async () => {
    const { rooms } = setup();
    expect(await rooms.update("ZZZZZ", () => {})).toBeUndefined();
  });
});

describe("idle expiry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sweeps rooms idle for 24 hours and keeps active ones", async () => {
    const { rooms, clock } = setup({ codes: ["AAAAA", "BBBBB"] });
    await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });
    clock.advance(12 * HOUR);
    await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Bob" });

    clock.advance(ROOM_IDLE_MS - 12 * HOUR);
    expect(await rooms.sweep()).toEqual([]);

    clock.advance(1);
    expect(await rooms.sweep()).toEqual(["AAAAA"]);
    expect(await rooms.get("AAAAA")).toBeUndefined();
    expect(await rooms.get("BBBBB")).toBeDefined();
  });

  it("counts a join as activity", async () => {
    const { rooms, clock } = setup();
    const { room, player } = await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });
    clock.advance(20 * HOUR);
    expectOk(await rooms.join(room.code, { name: "Ada", token: player.token }));
    clock.advance(20 * HOUR);
    expect(await rooms.sweep()).toEqual([]);
  });

  it("sweeps periodically once started", async () => {
    vi.useFakeTimers();
    const store = new InMemoryRoomStore();
    const rooms = new RoomManager({ store });
    const { room } = await rooms.create({ gameId: "stub", maxPlayers: 2, name: "Ada" });

    const stop = rooms.startSweep(HOUR);
    await vi.advanceTimersByTimeAsync(ROOM_IDLE_MS);
    expect(await rooms.get(room.code)).toBeDefined();
    await vi.advanceTimersByTimeAsync(HOUR);
    expect(await rooms.get(room.code)).toBeUndefined();
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
