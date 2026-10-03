import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToken, setToken } from "./token";

// Stub localStorage
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
});

// Provide a baseline location stub (Node doesn't have one)
vi.stubGlobal("location", { search: "" });

beforeEach(() => {
  // Reset to no player param before each test
  vi.stubGlobal("location", { search: "" });
});

afterEach(() => {
  store.clear();
});

describe("token storage", () => {
  it("stores and retrieves a token by room code", () => {
    setToken("ABCDE", "tok123");
    expect(getToken("ABCDE")).toBe("tok123");
  });

  it("returns null for an unknown room", () => {
    expect(getToken("NOPE")).toBeNull();
  });

  it("namespaces tokens by ?player=N", () => {
    vi.stubGlobal("location", { search: "?player=1" });
    setToken("ABCDE", "tok-p1");

    vi.stubGlobal("location", { search: "?player=2" });
    setToken("ABCDE", "tok-p2");

    vi.stubGlobal("location", { search: "?player=1" });
    expect(getToken("ABCDE")).toBe("tok-p1");

    vi.stubGlobal("location", { search: "?player=2" });
    expect(getToken("ABCDE")).toBe("tok-p2");
  });

  it("keeps tokens without ?player separate from namespaced ones", () => {
    vi.stubGlobal("location", { search: "" });
    setToken("ABCDE", "tok-default");

    vi.stubGlobal("location", { search: "?player=1" });
    setToken("ABCDE", "tok-p1");

    vi.stubGlobal("location", { search: "" });
    expect(getToken("ABCDE")).toBe("tok-default");
  });
});
