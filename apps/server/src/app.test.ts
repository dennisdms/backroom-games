import type { ServerMessage } from "@backroom/shared";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";

let app: Awaited<ReturnType<typeof buildApp>>;

afterEach(async () => {
  await app.close();
});

describe("GET /healthz", () => {
  it("reports ok", async () => {
    app = await buildApp({ logLevel: "silent" });
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("WebSocket /ws", () => {
  async function exchange(raw: string): Promise<ServerMessage> {
    app = await buildApp({ logLevel: "silent" });
    await app.ready();
    const ws = await app.injectWS("/ws");
    const reply = new Promise<ServerMessage>((resolve) => {
      ws.once("message", (data) => resolve(JSON.parse(data.toString())));
    });
    ws.send(raw);
    const message = await reply;
    ws.terminate();
    return message;
  }

  it("answers ping with pong", async () => {
    expect(await exchange('{"type":"ping"}')).toEqual({ type: "pong" });
  });

  it("answers an invalid message with an error", async () => {
    expect(await exchange("nonsense")).toMatchObject({ type: "error", code: "bad_message" });
  });
});
