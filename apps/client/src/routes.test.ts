import { CORNERS } from "@backroom/shared";
import { describe, expect, it } from "vitest";
import { createPath, normalizeCode, parseRoute, roomPath, withPlayer } from "./routes";

describe("parseRoute", () => {
  it("routes / to the landing page", () => {
    expect(parseRoute("/")).toEqual({ name: "landing" });
  });

  it("routes /r/:code to a room, uppercasing the code", () => {
    expect(parseRoute("/r/k7qxm")).toEqual({ name: "room", code: "K7QXM" });
  });

  it("routes /new/:game to the create form of a catalog game", () => {
    expect(parseRoute(createPath("corners"))).toEqual({ name: "create", game: CORNERS });
  });

  it("falls back to the landing page for unknown paths and games", () => {
    expect(parseRoute("/nope")).toEqual({ name: "landing" });
    expect(parseRoute("/new/chess")).toEqual({ name: "landing" });
    expect(parseRoute("/new/__proto__")).toEqual({ name: "landing" });
  });
});

describe("normalizeCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeCode("  k7qxm ")).toBe("K7QXM");
  });

  it("rejects blanks and other characters", () => {
    expect(normalizeCode("   ")).toBeNull();
    expect(normalizeCode("K7 QXM")).toBeNull();
    expect(normalizeCode("../x")).toBeNull();
  });
});

describe("withPlayer", () => {
  it("keeps ?player=N on a path", () => {
    expect(withPlayer(roomPath("K7QXM"), "2")).toBe("/r/K7QXM?player=2");
  });

  it("leaves the path alone without a player", () => {
    expect(withPlayer("/", null)).toBe("/");
  });
});
