import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";

let app: Awaited<ReturnType<typeof buildApp>>;

afterEach(async () => {
  await app.close();
});

describe("POST /api/rooms", () => {
  it("creates a room and returns code + token", async () => {
    app = await buildApp({ logLevel: "silent" });
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { playerName: "Alice" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ code: string; token: string }>();
    expect(body.code).toMatch(/^[A-Z0-9]{5}$/);
    expect(body.token).toMatch(/^[0-9a-f]{32}$/);
  });

  it("rejects a missing playerName", async () => {
    app = await buildApp({ logLevel: "silent" });
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "missing_name" });
  });

  it("rejects a blank playerName", async () => {
    app = await buildApp({ logLevel: "silent" });
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { playerName: "   " },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "missing_name" });
  });
});
