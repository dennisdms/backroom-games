import type { RoomState } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { newSession, receive, turnTimeLeft } from "./session";

const room = (version: number, code = "K7QXM"): RoomState => ({
  code,
  gameId: "corners",
  phase: "lobby",
  players: [
    { seat: 0, name: "Ada", online: true, colors: [] },
    { seat: 1, name: "Bob", online: true, colors: [] },
  ],
  host: 0,
  playerCounts: [2, 4],
  you: 1,
  settings: { turnTimer: 60 },
  options: { hints: false },
  turnTimeLeft: null,
  game: null,
  version,
});

describe("receive", () => {
  it("keeps the latest room state and drops stale ones", () => {
    let session = receive(newSession("K7QXM"), {
      type: "welcome",
      you: 1,
      token: "t",
      room: room(3),
    });
    expect(session.room?.version).toBe(3);
    session = receive(session, { type: "roomState", room: room(2) });
    expect(session.room?.version).toBe(3);
    session = receive(session, { type: "roomState", room: room(4) });
    expect(session.room?.version).toBe(4);
  });

  it("counts the turn clock down from when the state arrived", () => {
    const timed = { ...room(1), turnTimeLeft: 42_000 };
    const session = receive(newSession("K7QXM"), { type: "roomState", room: timed }, 1_000);
    expect(session.turnEndsAt).toBe(43_000);
    expect(turnTimeLeft(session, 2_000)).toBe(41_000);
    expect(turnTimeLeft(session, 50_000)).toBe(0);
    const off = receive(session, { type: "roomState", room: room(2) }, 3_000);
    expect(off.turnEndsAt).toBeNull();
    expect(turnTimeLeft(off)).toBeNull();
  });

  it("ignores states for another room", () => {
    const session = newSession("K7QXM");
    expect(receive(session, { type: "roomState", room: room(1, "ZZZZZ") })).toBe(session);
  });

  it("updates who's online", () => {
    let session = receive(newSession("K7QXM"), { type: "roomState", room: room(1) });
    session = receive(session, { type: "playerPresence", seat: 0, online: false });
    expect(session.room?.players.map((p) => p.online)).toEqual([false, true]);
    expect(session.room?.version).toBe(1);
  });

  it("shows errors until the next state", () => {
    let session = receive(newSession("K7QXM"), {
      type: "error",
      code: "room_full",
      message: "The room is full",
    });
    expect(session.error).toBe("The room is full");
    session = receive(session, { type: "roomState", room: room(1) });
    expect(session.error).toBeNull();
  });

  it("shows a restart until the next state", () => {
    let session = receive(newSession("K7QXM"), { type: "roomState", room: room(1) });
    session = receive(session, { type: "serverRestarting" });
    expect(session.restarting).toBe(true);
    session = receive(session, { type: "playerPresence", seat: 0, online: false });
    expect(session.restarting).toBe(true);
    session = receive(session, { type: "welcome", you: 1, token: "t", room: room(1) });
    expect(session.restarting).toBe(false);
  });

  it("stops showing a restart that lost the room", () => {
    let session = receive(newSession("K7QXM"), { type: "serverRestarting" });
    session = receive(session, {
      type: "error",
      code: "room_not_found",
      message: "There's no room with that code",
    });
    expect(session.restarting).toBe(false);
  });
});
