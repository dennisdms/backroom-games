import { describe, expect, it } from "vitest";
import type { Room } from "../rooms/room";
import { InMemoryRoomStore } from "./memory";

function room(code: string, lastActiveAt = 0): Room {
  return {
    code,
    gameId: "stub",
    maxPlayers: 2,
    settings: { turnTimer: 60 },
    options: {},
    turnEndsAt: null,
    phase: "lobby",
    hostSeat: 0,
    players: [{ seat: 0, name: "Ada", token: "t" }],
    game: null,
    version: 0,
    createdAt: 0,
    lastActiveAt,
  };
}

describe("InMemoryRoomStore", () => {
  it("refuses to insert a taken code", async () => {
    const store = new InMemoryRoomStore();
    expect(await store.insert(room("AAAAA"))).toBe(true);
    expect(await store.insert({ ...room("AAAAA"), gameId: "other" })).toBe(false);
    expect((await store.get("AAAAA"))?.gameId).toBe("stub");
  });

  it("keeps changes only once saved", async () => {
    const store = new InMemoryRoomStore();
    await store.insert(room("AAAAA"));
    const copy = await store.get("AAAAA");
    if (!copy) throw new Error("missing room");
    copy.players.push({ seat: 1, name: "Bob", token: "u" });
    expect((await store.get("AAAAA"))?.players).toHaveLength(1);
    await store.save(copy);
    expect((await store.get("AAAAA"))?.players).toHaveLength(2);
  });

  it("doesn't bring back a deleted room on save", async () => {
    const store = new InMemoryRoomStore();
    await store.insert(room("AAAAA"));
    await store.delete("AAAAA");
    await store.save(room("AAAAA"));
    expect(await store.get("AAAAA")).toBeUndefined();
  });

  it("deletes rooms idle since the cutoff", async () => {
    const store = new InMemoryRoomStore();
    await store.insert(room("AAAAA", 10));
    await store.insert(room("BBBBB", 20));
    expect(await store.deleteIdleSince(20)).toEqual(["AAAAA"]);
    expect(await store.get("BBBBB")).toBeDefined();
  });
});
