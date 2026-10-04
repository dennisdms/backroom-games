import { placementSquares } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { exampleState } from "./example";

describe("exampleState", () => {
  it("places four pieces, the last one blue's, and leaves yellow's corner empty", () => {
    const state = exampleState();
    expect(state.board.filter((cell) => cell !== 0)).toHaveLength(5 + 4 + 3 + 3);
    const [cx, cy] = state.variant.corners.yellow;
    expect(state.board[cy * state.variant.size + cx]).toBe(0);
    const last = state.lastMove;
    if (last?.move.kind !== "place") throw new Error("expected a placement");
    expect(last.color).toBe("blue");
    for (const [x, y] of placementSquares(last.move)) {
      expect(state.board[y * state.variant.size + x]).toBe(1);
    }
  });
});
