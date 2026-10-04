import { describe, expect, it } from "vitest";
import { normalize, ORIENTATIONS, PIECES, placementSquares, type Shape } from "./pieces";
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

describe("placementSquares", () => {
  it("offsets the orientation's squares by the placement position", () => {
    expect(placementSquares({ pieceId: "V3", orientation: 0, x: 4, y: 7 })).toEqual([
      [4, 7],
      [4, 8],
      [5, 8],
    ]);
  });

  it("uses the chosen orientation", () => {
    const shape = ORIENTATIONS.L4[2] ?? [];
    expect(placementSquares({ pieceId: "L4", orientation: 2, x: 1, y: 1 })).toEqual(
      shape.map(([x, y]) => [x + 1, y + 1]),
    );
  });

  it("throws for an orientation the piece doesn't have", () => {
    expect(() => placementSquares({ pieceId: "O4", orientation: 1, x: 0, y: 0 })).toThrow(
      RangeError,
    );
  });
});
