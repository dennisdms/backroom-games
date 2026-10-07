import { describe, expect, it } from "vitest";
import { CreateRoomRequest } from "./api";
import {
  CORNERS,
  choiceLabel,
  GAMES,
  gameInfo,
  HINTS,
  parseOptions,
  playerRange,
  playerRangeLabel,
  ROOM_SETTINGS,
  RoomSettings,
  TURN_TIMER,
} from "./games";

describe("catalog", () => {
  it("lists Corners for 2 to 4 players, with hints", () => {
    expect(GAMES).toContain(CORNERS);
    expect(gameInfo("corners")).toEqual({
      id: "corners",
      name: "Corners",
      playerCounts: [2, 3, 4],
      options: [HINTS],
    });
    expect(gameInfo("chess")).toBeUndefined();
  });

  it("has unique ids and ascending player counts", () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
    for (const game of GAMES) {
      expect(game.playerCounts.length).toBeGreaterThan(0);
      expect([...game.playerCounts].sort((a, b) => a - b)).toEqual(game.playerCounts);
    }
  });

  it("gives every setting a unique key and a default among its choices", () => {
    for (const game of GAMES) {
      const settings = [...ROOM_SETTINGS, ...game.options];
      expect(new Set(settings.map((s) => s.key)).size).toBe(settings.length);
      for (const s of settings) {
        expect(s.choices.map((c) => c.value)).toContain(s.default);
      }
    }
  });
});

describe("RoomSettings", () => {
  it("defaults to a one-minute turn timer", () => {
    expect(RoomSettings.parse({})).toEqual({ turnTimer: 60 });
    expect(CreateRoomRequest.parse({ game: "corners", name: "Ada" }).settings).toEqual({
      turnTimer: 60,
    });
  });

  it("only takes the listed timers", () => {
    for (const { value } of TURN_TIMER.choices) {
      expect(RoomSettings.parse({ turnTimer: value })).toEqual({ turnTimer: value });
    }
    expect(RoomSettings.safeParse({ turnTimer: 45 }).success).toBe(false);
    expect(RoomSettings.safeParse({ turnTimer: "60" }).success).toBe(false);
  });
});

describe("parseOptions", () => {
  it("fills in defaults", () => {
    expect(parseOptions(CORNERS.options, {})).toEqual({ hints: false });
    expect(parseOptions(CORNERS.options, { hints: true })).toEqual({ hints: true });
  });

  it.each([
    ["an unknown key", { hints: true, fog: true }],
    ["a value that isn't a choice", { hints: "yes" }],
    ["something that isn't an object", "hints"],
  ])("rejects %s", (_, input) => {
    expect(parseOptions(CORNERS.options, input)).toBeNull();
  });
});

describe("choiceLabel", () => {
  it("labels a value, falling back to the default", () => {
    expect(choiceLabel(TURN_TIMER, 30)).toBe("30 seconds");
    expect(choiceLabel(TURN_TIMER, 0)).toBe("off");
    expect(choiceLabel(HINTS, true)).toBe("on");
    expect(choiceLabel(HINTS, undefined)).toBe("off");
  });
});

describe("playerRange", () => {
  it("shows min–max, or one number for a single count", () => {
    expect(playerRange([2, 3, 4])).toBe("2–4");
    expect(playerRange([4])).toBe("4");
  });

  it("spells it out for screen readers", () => {
    expect(playerRangeLabel([2, 3, 4])).toBe("2 to 4 players");
    expect(playerRangeLabel([4])).toBe("4 players");
    expect(playerRangeLabel([1])).toBe("1 player");
  });
});
