import type { RoomState } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { newSession, receive } from "./session";

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
