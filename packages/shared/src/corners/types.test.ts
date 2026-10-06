import { describe, expect, it } from "vitest";
import { COLORS, FOUR_PLAYER, PIECE_IDS, THREE_PLAYER, TWO_PLAYER, Variant } from "./types";

describe("PIECE_IDS", () => {
  it("names 21 distinct pieces", () => {
    expect(new Set(PIECE_IDS).size).toBe(21);
  });
});

describe.each([
  ["FOUR_PLAYER", FOUR_PLAYER, 4],
  ["THREE_PLAYER", THREE_PLAYER, 3],
  ["TWO_PLAYER", TWO_PLAYER, 2],
])("%s", (_, variant, players) => {
  it("is a valid variant", () => {
    expect(Variant.parse(variant)).toEqual(variant);
  });

  it("plays one color per player, in turn order", () => {
    expect(variant.colors).toEqual(COLORS.slice(0, players));
    expect(variant.seats).toEqual(variant.colors.map((c) => [c]));
  });

  it("starts every color in a different board corner", () => {
    const last = variant.size - 1;
    const corners = variant.colors.map((c) => variant.corners[c].join());
    expect(new Set(corners).size).toBe(variant.colors.length);
    for (const [x, y] of Object.values(variant.corners)) {
      expect([0, last]).toContain(x);
      expect([0, last]).toContain(y);
    }
  });

  it("starts each color clockwise from the previous one", () => {
    const [blue, yellow, red] = variant.colors.map((c) => variant.corners[c]);
    expect(blue).toEqual([0, 0]);
    expect(yellow).toEqual([19, 0]);
    if (red) expect(red).toEqual([19, 19]);
  });
});
