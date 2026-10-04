import { describe, expect, it } from "vitest";
import {
  flipOrientation,
  normalize,
  ORIENTATIONS,
  PIECES,
  rotateOrientation,
  type Shape,
} from "./pieces";
import { PIECE_IDS } from "./types";

const key = (shape: Shape) => normalize(shape).join(";");

const isConnected = (shape: Shape) => {
  const left = new Set(shape.map(([x, y]) => `${x},${y}`));
  const queue = [shape[0]];
  while (queue.length > 0) {
    const square = queue.pop();
    if (!square || !left.delete(`${square[0]},${square[1]}`)) continue;
    const [x, y] = square;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return left.size === 0;
};

describe("PIECES", () => {
  it("defines the 21 pieces, 89 squares in total", () => {
    expect(Object.keys(PIECES).toSorted()).toEqual([...PIECE_IDS].sort());
    const squares = Object.values(PIECES).reduce((n, p) => n + p.length, 0);
    expect(squares).toBe(89);
  });

  it("has 1 monomino, 1 domino, 2 trominoes, 5 tetrominoes, 12 pentominoes", () => {
    const sizes = Object.values(PIECES).map((p) => p.length);
    const count = (n: number) => sizes.filter((s) => s === n).length;
    expect([1, 2, 3, 4, 5].map(count)).toEqual([1, 1, 2, 5, 12]);
  });

  it.each(PIECE_IDS)("%s is connected, normalized and named by its size", (id) => {
    const shape = PIECES[id];
    expect(isConnected(shape)).toBe(true);
    expect(shape).toEqual(normalize(shape));
    expect(new Set(shape.map(String)).size).toBe(shape.length);
    expect(id.endsWith(String(shape.length))).toBe(true);
  });

  it("has no two pieces with the same shape in any orientation", () => {
    const all = Object.values(ORIENTATIONS).flatMap((os) => os.map(key));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("ORIENTATIONS", () => {
  it("has 91 unique orientations in total", () => {
    const total = Object.values(ORIENTATIONS).reduce((n, o) => n + o.length, 0);
    expect(total).toBe(91);
  });

  it.each([
    ["I1", 1],
    ["X5", 1],
    ["I2", 2],
    ["F5", 8],
  ] as const)("%s has %i orientations", (id, n) => {
    expect(ORIENTATIONS[id]).toHaveLength(n);
  });

  it.each(PIECE_IDS)("%s starts with its base shape, all distinct and normalized", (id) => {
    const orientations = ORIENTATIONS[id];
    expect(orientations[0]).toEqual(PIECES[id]);
    expect(new Set(orientations.map(key)).size).toBe(orientations.length);
    for (const o of orientations) {
      expect(o).toEqual(normalize(o));
      expect(o).toHaveLength(PIECES[id].length);
    }
  });
});

describe("rotateOrientation and flipOrientation", () => {
  it("turns L4 clockwise and back, as seen on screen", () => {
    const turned = rotateOrientation("L4", 0, 1);
    expect(ORIENTATIONS.L4[turned]).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ]);
    expect(rotateOrientation("L4", turned, -1)).toBe(0);
  });

  it("flips L4 left to right", () => {
    expect(ORIENTATIONS.L4[flipOrientation("L4", 0)]).toEqual([
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ]);
  });

  it.each(PIECE_IDS)("%s returns to the start after four turns or two flips", (id) => {
    ORIENTATIONS[id].forEach((_, start) => {
      let o = start;
      for (let i = 0; i < 4; i++) o = rotateOrientation(id, o);
      expect(o).toBe(start);
      for (let i = 0; i < 4; i++) o = rotateOrientation(id, o, -1);
      expect(o).toBe(start);
      expect(rotateOrientation(id, rotateOrientation(id, start), -1)).toBe(start);
      expect(flipOrientation(id, flipOrientation(id, start))).toBe(start);
    });
  });

  it.each(PIECE_IDS)("%s reaches every orientation by turning and flipping", (id) => {
    const seen = new Set<number>();
    for (const first of [0, flipOrientation(id, 0)]) {
      let o = first;
      for (let i = 0; i < 4; i++) {
        seen.add(o);
        o = rotateOrientation(id, o);
      }
    }
    expect(seen.size).toBe(ORIENTATIONS[id].length);
  });

  it("keeps the monomino and X5 at 0, and turns an unknown orientation from the base", () => {
    expect(rotateOrientation("I1", 0)).toBe(0);
    expect(flipOrientation("I1", 0)).toBe(0);
    expect(rotateOrientation("X5", 0, -1)).toBe(0);
    expect(rotateOrientation("I2", 99)).toBe(1);
  });
});
