import {
  type CornersState,
  FOUR_PLAYER,
  newGame,
  type RoomState,
  TWO_PLAYER,
} from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { ordinal, resultText, standings, trayColor, turnText } from "./game";

const roomFor = (game: CornersState, you: number, names: string[]): RoomState => ({
  code: "K7QXM",
  phase: "playing",
  players: names.map((name, seat) => ({
    seat,
    name,
    online: true,
    colors: game.variant.seats[seat] ?? [],
  })),
  host: 0,
  playerCounts: [2, 4],
  you,
  game,
  version: 1,
});

describe("trayColor", () => {
  it("is the color to move when it's the seat's, else its next one", () => {
    const state = newGame(TWO_PLAYER); // Blue to move; seat 0 has blue and red.
    expect(trayColor(state, 0)).toBe("blue");
    expect(trayColor(state, 1)).toBe("yellow");
    expect(trayColor({ ...state, turn: "yellow" }, 0)).toBe("red");
    expect(trayColor({ ...state, turn: "green" }, 0)).toBe("blue");
    expect(trayColor({ ...state, turn: "red" }, 1)).toBe("green");
  });

  it("is null for a seat without colors", () => {
    expect(trayColor(newGame(TWO_PLAYER), 5)).toBeNull();
  });
});

describe("turnText", () => {
  it("says whose turn it is, and the color", () => {
    const state = { ...newGame(FOUR_PLAYER), turn: "yellow" as const };
    expect(turnText(roomFor(state, 1, ["Ada", "Grace", "Linus", "Barbara"]), state)).toBe(
      "Your turn (yellow)",
    );
    expect(turnText(roomFor(state, 0, ["Ada", "Grace", "Linus", "Barbara"]), state)).toBe(
      "Grace's turn (yellow)",
    );
  });
});

/** A four-player game where each color has only its first `counts[color]` pieces (I1, I2, …) left. */
const withRemaining = (counts: Record<"blue" | "yellow" | "red" | "green", number>) => {
  const state = newGame(FOUR_PLAYER);
  for (const color of ["blue", "yellow", "red", "green"] as const) {
    state.remaining[color] = state.remaining[color].slice(0, counts[color]);
  }
  return state;
};

describe("standings", () => {
  it("ranks seats by score, ties sharing a rank", () => {
    // I1 = 1 square, I2 = 2, I3 = 3: scores -1, -3, -1, 15.
    const state = withRemaining({ blue: 1, yellow: 2, red: 1, green: 0 });
    state.lastPlaced.green = "Z5";
    const room = roomFor(state, 2, ["Ada", "Grace", "Linus", "Barbara"]);
    expect(standings(room, state)).toEqual([
      { seat: 3, name: "Barbara", colors: ["green"], score: 15, rank: 1 },
      { seat: 0, name: "Ada", colors: ["blue"], score: -1, rank: 2 },
      { seat: 2, name: "Linus", colors: ["red"], score: -1, rank: 2 },
      { seat: 1, name: "Grace", colors: ["yellow"], score: -3, rank: 4 },
    ]);
  });

  it("sums both colors of a two-player seat", () => {
    const state = newGame(TWO_PLAYER);
    state.remaining.blue = ["I1"];
    state.remaining.red = ["I2"];
    state.remaining.yellow = ["I3"];
    state.remaining.green = ["I1"];
    const room = roomFor(state, 0, ["Ada", "Grace"]);
    expect(standings(room, state).map((s) => [s.name, s.score, s.rank])).toEqual([
      ["Ada", -3, 1],
      ["Grace", -4, 2],
    ]);
  });
});

describe("resultText", () => {
  const state = withRemaining({ blue: 1, yellow: 1, red: 2, green: 2 });
  const names = ["Ada", "Grace", "Linus", "Barbara"];

  it("names the winner, or you", () => {
    const solo = withRemaining({ blue: 1, yellow: 2, red: 2, green: 2 });
    expect(resultText(roomFor(solo, 1, names), standings(roomFor(solo, 1, names), solo))).toBe(
      "Ada wins!",
    );
    expect(resultText(roomFor(solo, 0, names), standings(roomFor(solo, 0, names), solo))).toBe(
      "You win!",
    );
  });

  it("lists everyone who tied for first", () => {
    const room = roomFor(state, 3, names);
    expect(resultText(room, standings(room, state))).toBe("It's a tie between Ada and Grace.");
    const mine = roomFor(state, 1, names);
    expect(resultText(mine, standings(mine, state))).toBe("It's a tie between Ada and you.");
  });
});

describe("ordinal", () => {
  it("covers four seats", () => {
    expect([1, 2, 3, 4].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th"]);
  });
});
