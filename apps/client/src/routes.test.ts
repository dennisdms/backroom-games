import { describe, expect, it } from "vitest";
import { parseRoute } from "./routes";

describe("parseRoute", () => {
  it("routes / to the landing page", () => {
    expect(parseRoute("/")).toEqual({ name: "landing" });
  });

  it("routes /r/:code to a room, uppercasing the code", () => {
    expect(parseRoute("/r/k7qxm")).toEqual({ name: "room", code: "K7QXM" });
  });

  it("falls back to the landing page for unknown paths", () => {
    expect(parseRoute("/nope")).toEqual({ name: "landing" });
  });
});
