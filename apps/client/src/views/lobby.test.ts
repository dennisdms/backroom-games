import type { RoomState } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { formatCounts, startBlocker } from "./lobby";

const room = (players: number, playerCounts = [2, 4]): RoomState => ({
  code: "K7QXM",
  gameId: "corners",
  phase: "lobby",
  players: Array.from({ length: players }, (_, seat) => ({
    seat,
    name: `P${seat}`,
    online: true,
    colors: [],
  })),
  host: 0,
  playerCounts,
  you: 0,
  game: null,
  version: 1,
});

describe("formatCounts", () => {
  it("lists counts with a final 'or'", () => {
    expect(formatCounts([2])).toBe("2");
    expect(formatCounts([2, 4])).toBe("2 or 4");
    expect(formatCounts([2, 3, 4])).toBe("2, 3 or 4");
  });
});

describe("startBlocker", () => {
  it("is null for a valid player count", () => {
    expect(startBlocker(room(2))).toBeNull();
    expect(startBlocker(room(4))).toBeNull();
  });

  it("explains an invalid player count", () => {
    expect(startBlocker(room(1))).toBe(
      "The game needs 2 or 4 players to start; there is 1 player.",
    );
    expect(startBlocker(room(3))).toBe(
      "The game needs 2 or 4 players to start; there are 3 players.",
    );
  });
});
