import { describe, expect, it } from "vitest";
import { gameName } from "./names";

describe("gameName", () => {
  it("names a known game", () => {
    expect(gameName("corners")).toBe("Corners");
  });

  it("falls back to the id", () => {
    expect(gameName("chess")).toBe("chess");
  });
});
