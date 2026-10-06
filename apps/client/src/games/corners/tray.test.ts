import {
  flipOrientation,
  newGame,
  PIECE_IDS,
  placementSquares,
  rotateOrientation,
  TWO_PLAYER,
} from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { act, bySize, ghostPlacement, keyAction, newTrayLocal, pressBoard } from "./tray";

describe("ghostPlacement", () => {
  it("puts the top left of the piece on the anchor", () => {
    expect(ghostPlacement("X5", 0, [10, 10], 20)).toEqual({
      pieceId: "X5",
      orientation: 0,
      x: 10,
      y: 10,
    });
    const turned = rotateOrientation("L4", 0);
    expect(ghostPlacement("L4", turned, [5, 7], 20)).toMatchObject({ x: 5, y: 7 });
  });

  it("fills a board corner when the anchor is on it", () => {
    for (const pieceId of ["L5", "V5", "P5", "W5"] as const) {
      expect(placementSquares(ghostPlacement(pieceId, 0, [0, 0], 20))).toContainEqual([0, 0]);
    }
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

  it("cancel puts the piece back", () => {
    const local = {
      ...newTrayLocal(),
      piece: "T4" as const,
      orientation: 2,
      tapped: [3, 4] as const,
    };
    expect(act(local, "cancel")).toBe(true);
    expect(local).toMatchObject({ piece: null, orientation: 0, tapped: null });
  });
});

describe("pressBoard", () => {
  const state = newGame(TWO_PLAYER); // Blue to move, its corner top left.

  it("plays a legal move with one click", () => {
    const local = { ...newTrayLocal(), piece: "I1" as const };
    expect(pressBoard(state, "blue", local, [0, 0])).toEqual({
      pieceId: "I1",
      orientation: 0,
      x: 0,
      y: 0,
    });
    expect(local).toMatchObject({ piece: null, orientation: 0 });
  });

  it("does nothing on an illegal click", () => {
    const local = { ...newTrayLocal(), piece: "I1" as const };
    expect(pressBoard(state, "blue", local, [5, 5])).toBeNull();
    expect(local).toEqual({ ...newTrayLocal(), piece: "I1" });
  });

  it("does nothing off turn or without a piece", () => {
    expect(pressBoard(state, "yellow", { ...newTrayLocal(), piece: "I1" }, [19, 0])).toBeNull();
    expect(pressBoard(state, "blue", newTrayLocal(), [0, 0])).toBeNull();
  });

  it("on touch, previews on the first tap and plays on a second tap there", () => {
    const local = { ...newTrayLocal(), piece: "I1" as const, touch: true };
    expect(pressBoard(state, "blue", local, [3, 3])).toBeNull();
    expect(local.tapped).toEqual([3, 3]);
    expect(pressBoard(state, "blue", local, [0, 0])).toBeNull();
    expect(local.tapped).toEqual([0, 0]);
    expect(pressBoard(state, "blue", local, [0, 0])).toMatchObject({ x: 0, y: 0 });
    expect(local).toMatchObject({ piece: null, tapped: null });
  });

  it("on touch, a second tap on an illegal preview does nothing", () => {
    const local = { ...newTrayLocal(), piece: "I1" as const, touch: true, tapped: [5, 5] as const };
    expect(pressBoard(state, "blue", local, [5, 5])).toBeNull();
    expect(local).toMatchObject({ piece: "I1", tapped: [5, 5] });
  });
});

describe("bySize", () => {
  const all = PIECE_IDS.map((id) => ({ id, color: "blue" as const }));

  it("puts a full hand in five rows, one per square count", () => {
    const rows = bySize(all);
    expect(rows.map((r) => r.size)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((r) => r.pieces.length)).toEqual([1, 1, 2, 5, 12]);
    expect(rows[2]?.pieces.map((p) => p.id)).toEqual(["I3", "V3"]);
    expect(rows.flatMap((r) => r.pieces)).toEqual(all);
  });

  it("leaves out sizes with no pieces and keeps the order within a row", () => {
    const pieces = [
      { id: "X5", color: "red" },
      { id: "I1", color: "blue" },
      { id: "F5", color: "blue" },
    ] as const;
    expect(bySize(pieces)).toEqual([
      { size: 1, pieces: [pieces[1]] },
      { size: 5, pieces: [pieces[0], pieces[2]] },
    ]);
  });
});
