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
});
