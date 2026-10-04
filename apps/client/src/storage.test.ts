import { describe, expect, it } from "vitest";
import { type KeyValueStore, playerFromSearch, playerStorage } from "./storage";

function fakeStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("playerFromSearch", () => {
  it("reads ?player=N", () => {
    expect(playerFromSearch("?player=2")).toBe("2");
    expect(playerFromSearch("?x=1&player=13")).toBe("13");
  });

  it("ignores a missing or odd value", () => {
    expect(playerFromSearch("")).toBeNull();
    expect(playerFromSearch("?player=")).toBeNull();
    expect(playerFromSearch("?player=bob")).toBeNull();
    expect(playerFromSearch("?player=12345")).toBeNull();
  });
});

describe("playerStorage", () => {
  it("stores the token per room", () => {
    const store = fakeStore();
    const storage = playerStorage(store, null);
    storage.setToken("K7QXM", "secret");
    expect(storage.token("K7QXM")).toBe("secret");
    expect(storage.token("ABCDE")).toBeNull();
    expect(store.data.get("backroom:K7QXM:token")).toBe("secret");
  });

  it("stores the name per room and remembers it as the last name", () => {
    const store = fakeStore();
    const storage = playerStorage(store, null);
    expect(storage.lastName()).toBeNull();
    storage.setName("K7QXM", "Ada");
    expect(storage.name("K7QXM")).toBe("Ada");
    expect(storage.name("ABCDE")).toBeNull();
    expect(storage.lastName()).toBe("Ada");
  });

  it("keeps each ?player=N separate", () => {
    const store = fakeStore();
    const one = playerStorage(store, null);
    const two = playerStorage(store, "2");
    one.setToken("K7QXM", "token-1");
    one.setName("K7QXM", "Ada");
    two.setToken("K7QXM", "token-2");

    expect(one.token("K7QXM")).toBe("token-1");
    expect(two.token("K7QXM")).toBe("token-2");
    expect(two.name("K7QXM")).toBeNull();
    expect(two.lastName()).toBeNull();
    expect(playerStorage(store, "3").token("K7QXM")).toBeNull();
    expect(store.data.get("backroom:p2:K7QXM:token")).toBe("token-2");
  });

  it("forgets quietly when storage throws or is missing", () => {
    for (const store of [throwingStore, null]) {
      const storage = playerStorage(store, "1");
      expect(() => storage.setToken("K7QXM", "secret")).not.toThrow();
      expect(() => storage.setName("K7QXM", "Ada")).not.toThrow();
      expect(storage.token("K7QXM")).toBeNull();
      expect(storage.name("K7QXM")).toBeNull();
      expect(storage.lastName()).toBeNull();
    }
  });
});
