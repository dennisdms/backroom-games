import { describe, expect, it } from "vitest";
import { parseClientMessage, parseServerMessage } from "./protocol";

describe("parseClientMessage", () => {
  it("accepts a known message", () => {
    expect(parseClientMessage('{"type":"ping"}')).toEqual({ type: "ping" });
  });

  it("rejects an unknown type", () => {
    expect(parseClientMessage('{"type":"selfDestruct"}')).toBeNull();
  });

  it("rejects invalid JSON", () => {
    expect(parseClientMessage("{not json")).toBeNull();
  });
});

describe("parseServerMessage", () => {
  it("requires the fields of a message", () => {
    expect(parseServerMessage('{"type":"error","code":"bad"}')).toBeNull();
  });
});
