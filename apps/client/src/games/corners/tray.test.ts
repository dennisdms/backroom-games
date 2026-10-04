import { flipOrientation, placementSquares, rotateOrientation } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { act, ghostPlacement, keyAction, newTrayLocal } from "./tray";

describe("ghostPlacement", () => {
  it("centers the piece on the anchor, rounding up and left", () => {
    // X5 is 3×3: its middle square lands on the anchor.
    const x5 = ghostPlacement("X5", 0, [10, 10], 20);
    expect(x5).toEqual({ pieceId: "X5", orientation: 0, x: 9, y: 9 });
    expect(placementSquares(x5)).toContainEqual([10, 10]);
    // I2 is 2×1: the anchor is its left square.
    expect(ghostPlacement("I2", 0, [5, 7], 20)).toMatchObject({ x: 5, y: 7 });
    // L4 turned is 3×2.
    const turned = rotateOrientation("L4", 0);
    expect(ghostPlacement("L4", turned, [5, 7], 20)).toMatchObject({ x: 4, y: 7 });
  });

  it("keeps the piece on the board near an edge", () => {
    expect(ghostPlacement("I5", 0, [0, 0], 20)).toMatchObject({ x: 0, y: 0 });
    expect(ghostPlacement("I5", 0, [19, 19], 20)).toMatchObject({ x: 15, y: 19 });
    const flipped = flipOrientation("L5", 0);
    for (const [x, y] of placementSquares(ghostPlacement("L5", flipped, [19, 0], 20)) ?? []) {
      expect(x).toBeLessThan(20);
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  it("falls back to the base orientation for an unknown one", () => {
    expect(ghostPlacement("I1", 3, [2, 2], 20)).toMatchObject({ orientation: 0 });
  });
});

describe("keyAction", () => {
  it("maps R, E, F and Escape, in either case", () => {
    expect(keyAction({ key: "r" })).toBe("rotate-cw");
    expect(keyAction({ key: "R" })).toBe("rotate-cw");
    expect(keyAction({ key: "e" })).toBe("rotate-ccw");
    expect(keyAction({ key: "f" })).toBe("flip");
    expect(keyAction({ key: "Escape" })).toBe("cancel");
  });

  it("ignores other keys and shortcuts", () => {
    expect(keyAction({ key: "x" })).toBeNull();
    expect(keyAction({ key: "r", ctrlKey: true })).toBeNull();
    expect(keyAction({ key: "f", metaKey: true })).toBeNull();
  });
});

describe("act", () => {
  it("does nothing without a piece", () => {
    const local = newTrayLocal();
    expect(act(local, "rotate-cw")).toBe(false);
    expect(act(local, "flip")).toBe(false);
    expect(act(local, "undo")).toBe(false);
    expect(act(local, "cancel")).toBe(false);
  });

  it("turns and flips the picked piece", () => {
    const local = { ...newTrayLocal(), piece: "L4" as const };
    act(local, "rotate-cw");
    expect(local.orientation).toBe(rotateOrientation("L4", 0));
    act(local, "rotate-ccw");
    act(local, "flip");
    expect(local.orientation).toBe(flipOrientation("L4", 0));
  });

  it("undo lifts the ghost, cancel lifts it and then puts the piece back", () => {
    const local = {
      ...newTrayLocal(),
      piece: "T4" as const,
      orientation: 2,
      pinned: [3, 4] as const,
    };
    expect(act(local, "undo")).toBe(true);
    expect(local).toMatchObject({ piece: "T4", pinned: null });
    local.pinned = [3, 4];
    act(local, "cancel");
    expect(local).toMatchObject({ piece: "T4", pinned: null });
    act(local, "cancel");
    expect(local).toMatchObject({ piece: null, orientation: 0 });
  });
});
