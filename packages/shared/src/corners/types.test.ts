import { describe, expect, it } from "vitest";
import { COLORS, FOUR_PLAYER, PIECE_IDS, TWO_PLAYER, Variant } from "./types";

describe("PIECE_IDS", () => {
  it("names 21 distinct pieces", () => {
    expect(new Set(PIECE_IDS).size).toBe(21);
  });
});

describe.each([
  ["FOUR_PLAYER", FOUR_PLAYER, 4],
  ["TWO_PLAYER", TWO_PLAYER, 2],
])("%s", (_, variant, players) => {
  it("is a valid variant", () => {
    expect(Variant.parse(variant)).toEqual(variant);
  });

  it("gives every color to exactly one seat", () => {
    expect(variant.seats).toHaveLength(players);
    expect(variant.seats.flat().toSorted()).toEqual([...COLORS].sort());
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
});
