import { describe, expect, it } from "vitest";
import { newGame } from "./rules";
import { score } from "./scoring";
import {
  COLORS,
  type Color,
  type CornersState,
  FOUR_PLAYER,
  type PieceId,
  TWO_PLAYER,
} from "./types";

/** `state` with `color` having placed every piece, the last being `last`. */
const allPlaced = (state: CornersState, color: Color, last: PieceId): CornersState => ({
  ...state,
  remaining: { ...state.remaining, [color]: [] },
  lastPlaced: { ...state.lastPlaced, [color]: last },
});

describe("score", () => {
  it("gives -89 to every color in a fresh game", () => {
    const { byColor, bySeat } = score(newGame(FOUR_PLAYER));
    for (const color of COLORS) expect(byColor[color]).toBe(-89);
    expect(bySeat).toEqual([-89, -89, -89, -89]);
  });

  it("subtracts only the squares still in hand", () => {
    const game = newGame(FOUR_PLAYER);
    const state: CornersState = {
      ...game,
      remaining: { ...game.remaining, blue: ["I1", "X5"] },
      lastPlaced: { ...game.lastPlaced, blue: "I5" },
    };
    expect(score(state).byColor.blue).toBe(-6);
  });

  it("gives +15 for placing every piece", () => {
    const state = allPlaced(newGame(FOUR_PLAYER), "blue", "X5");
    expect(score(state).byColor.blue).toBe(15);
    expect(score(state).byColor.yellow).toBe(-89);
  });

  it("gives +20 for placing every piece, ending on the monomino", () => {
    const state = allPlaced(newGame(FOUR_PLAYER), "blue", "I1");
    expect(score(state).byColor.blue).toBe(20);
  });

  it("uses the color's own last piece, not the game's last move", () => {
    const game = allPlaced(newGame(FOUR_PLAYER), "blue", "I1");
    const state: CornersState = {
      ...game,
      lastMove: {
        color: "yellow",
        move: { kind: "place", pieceId: "X5", orientation: 0, x: 18, y: 0 },
      },
      lastPlaced: { ...game.lastPlaced, yellow: "X5" },
    };
    expect(score(state).byColor.blue).toBe(20);
  });

  it("sums each 2-player seat's two colors", () => {
    let state = newGame(TWO_PLAYER);
    state = allPlaced(state, "blue", "I1");
    state = allPlaced(state, "red", "X5");
    const { byColor, bySeat } = score(state);
    expect(byColor).toEqual({ blue: 20, yellow: -89, red: 15, green: -89 });
    expect(bySeat).toEqual([35, -178]);
  });
});
