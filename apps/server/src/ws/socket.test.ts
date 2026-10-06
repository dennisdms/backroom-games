import { type ClientMessage, CornersState, type ServerMessage } from "@backroom/shared";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";

type App = Awaited<ReturnType<typeof buildApp>>;
type Of<T extends ServerMessage["type"]> = Extract<ServerMessage, { type: T }>;

let app: App;

afterEach(async () => {
  await app.close();
});

/** A WebSocket client that collects what the server sends. */
async function connect() {
  const ws = await app.injectWS("/ws");
  const inbox: ServerMessage[] = [];
  let wake = () => {};
  ws.on("message", (data) => {
    inbox.push(JSON.parse(data.toString()));
    wake();
  });

  /** The next message of this type. Skips any other messages before it. */
  async function next<T extends ServerMessage["type"]>(type: T): Promise<Of<T>> {
    for (;;) {
      const message = inbox.shift();
      if (message?.type === type) return message as Of<T>;
      if (!message) await new Promise<void>((resolve) => (wake = resolve));
    }
  }

  return {
    ws,
    inbox,
    next,
    send: (message: ClientMessage) => ws.send(JSON.stringify(message)),
  };
}

type Player = Awaited<ReturnType<typeof connect>>;

/** A Corners room with Ada hosting and Bob joined, both connected. */
async function twoPlayers() {
  app = await buildApp({ logLevel: "silent" });
  await app.ready();
  const { room, player } = await app.rooms.create({
    gameId: "corners",
    maxPlayers: 4,
    name: "Ada",
  });
  const ada = await connect();
  ada.send({ type: "hello", code: room.code, token: player.token, name: "Ada" });
  await ada.next("welcome");
  const bob = await connect();
  bob.send({ type: "hello", code: room.code.toLowerCase(), name: " Bob " });
  const welcome = await bob.next("welcome");
  await ada.next("roomState");
  return { code: room.code, ada, bob, bobToken: welcome.token };
}

async function start(ada: Player, bob: Player) {
  ada.send({ type: "startGame" });
  await ada.next("roomState");
  await bob.next("roomState");
}

const monominoAt = (x: number, y: number): ClientMessage => ({
  type: "placePiece",
  pieceId: "I1",
  orientation: 0,
  x,
  y,
});

describe("hello", () => {
  it("seats players and tells the others", async () => {
    app = await buildApp({ logLevel: "silent" });
    await app.ready();
    const { room, player } = await app.rooms.create({
      gameId: "corners",
      maxPlayers: 4,
      name: "Ada",
    });
    const ada = await connect();
    ada.send({ type: "hello", code: room.code, token: player.token, name: "Ada" });
    expect(await ada.next("welcome")).toEqual({
      type: "welcome",
      you: 0,
      token: player.token,
      room: {
        code: room.code,
        phase: "lobby",
        players: [{ seat: 0, name: "Ada", online: true, colors: [] }],
        host: 0,
        playerCounts: [2, 3, 4],
        you: 0,
        game: null,
        version: 0,
      },
    });

    const bob = await connect();
    bob.send({ type: "hello", code: room.code, name: "Bob" });
    const welcome = await bob.next("welcome");
    expect(welcome.you).toBe(1);
    expect(welcome.token).not.toBe(player.token);
    const state = await ada.next("roomState");
    expect(state.room).toMatchObject({ you: 0, version: 1 });
    // Two players can start, so the lobby shows the colors they'd play.
    expect(state.room.players).toEqual([
      { seat: 0, name: "Ada", online: true, colors: ["blue"] },
      { seat: 1, name: "Bob", online: true, colors: ["yellow"] },
    ]);
    expect(JSON.stringify(state)).not.toContain(welcome.token);
  });

  it("rejects unknown rooms and bad names", async () => {
    app = await buildApp({ logLevel: "silent" });
    await app.ready();
    const client = await connect();
    client.send({ type: "hello", code: "ZZZZZ", name: "Ada" });
    expect(await client.next("error")).toMatchObject({ code: "room_not_found" });
    const { room } = await app.rooms.create({ gameId: "corners", maxPlayers: 4, name: "Ada" });
    client.send({ type: "hello", code: room.code, name: "x".repeat(25) });
    expect(await client.next("error")).toMatchObject({ code: "bad_name" });
    client.send({ type: "hello", code: room.code, name: "   " });
    expect(await client.next("error")).toMatchObject({ code: "bad_name" });
    expect((await app.rooms.get(room.code))?.players).toHaveLength(1);
  });

  it("gives a reconnecting player their seat and the full state back", async () => {
    const { code, ada, bob, bobToken } = await twoPlayers();
    await start(ada, bob);
    ada.send(monominoAt(0, 0));
    await ada.next("roomState");

    bob.ws.terminate();
    expect(await ada.next("playerPresence")).toEqual({
      type: "playerPresence",
      seat: 1,
      online: false,
    });

    const again = await connect();
    again.send({ type: "hello", code, token: bobToken, name: "Someone else" });
    const welcome = await again.next("welcome");
    expect(welcome).toMatchObject({ you: 1, token: bobToken });
    expect(welcome.room).toMatchObject({ phase: "playing", you: 1, version: 3 });
    expect(welcome.room.players[1]).toEqual({
      seat: 1,
      name: "Bob",
      online: true,
      colors: ["yellow"],
    });
    expect(welcome.room.game?.board[0]).toBe(1);
    expect(welcome.room.game?.turn).toBe("yellow");
    expect(await ada.next("playerPresence")).toEqual({
      type: "playerPresence",
      seat: 1,
      online: true,
    });
  });
});

describe("startGame", () => {
  it("is for the host, with enough players", async () => {
    app = await buildApp({ logLevel: "silent" });
    await app.ready();
    const { room, player } = await app.rooms.create({
      gameId: "corners",
      maxPlayers: 4,
      name: "Ada",
    });
    const ada = await connect();
    ada.send({ type: "hello", code: room.code, token: player.token, name: "Ada" });
    await ada.next("welcome");
    ada.send({ type: "startGame" });
    expect(await ada.next("error")).toMatchObject({ code: "bad_player_count" });

    const bob = await connect();
    bob.send({ type: "hello", code: room.code, name: "Bob" });
    await bob.next("welcome");
    bob.send({ type: "startGame" });
    expect(await bob.next("error")).toMatchObject({ code: "not_host" });
    expect(await app.rooms.get(room.code)).toMatchObject({ phase: "lobby", version: 1 });
  });
});

describe("moves", () => {
  it("two players start, move, and both get the new state", async () => {
    const { ada, bob } = await twoPlayers();
    ada.send({ type: "startGame" });
    for (const [player, you] of [
      [ada, 0],
      [bob, 1],
    ] as const) {
      const { room } = await player.next("roomState");
      expect(room).toMatchObject({ phase: "playing", you, version: 2 });
      expect(room.players.map((p) => p.colors)).toEqual([["blue"], ["yellow"]]);
      expect(room.game?.turn).toBe("blue");
    }

    ada.send(monominoAt(0, 0));
    for (const player of [ada, bob]) {
      const { room } = await player.next("roomState");
      expect(room.version).toBe(3);
      expect(room.game?.board[0]).toBe(1);
      expect(room.game?.turn).toBe("yellow");
    }

    bob.send(monominoAt(19, 0));
    for (const player of [ada, bob]) {
      const { room } = await player.next("roomState");
      expect(room.version).toBe(4);
      expect(room.game?.turn).toBe("blue");
    }
  });

  it("answers an illegal move with an error and changes nothing", async () => {
    const { code, ada, bob } = await twoPlayers();
    await start(ada, bob);
    const before = await app.rooms.get(code);

    bob.send(monominoAt(19, 0));
    expect(await bob.next("error")).toMatchObject({ code: "illegal_move" });
    ada.send(monominoAt(5, 5));
    expect(await ada.next("error")).toMatchObject({ code: "illegal_move" });
    ada.send({ type: "pass" });
    expect(await ada.next("error")).toMatchObject({ code: "illegal_move" });
    ada.send({ type: "rematch" });
    expect(await ada.next("error")).toMatchObject({ code: "wrong_phase" });

    expect(await app.rooms.get(code)).toEqual(before);
    expect(ada.inbox).toEqual([]);
    expect(bob.inbox).toEqual([]);
  });

  it("finishes the game on its last move, and the host can rematch", async () => {
    const { code, ada, bob } = await twoPlayers();
    await start(ada, bob);
    // Leave blue a single piece and everyone else none.
    await app.rooms.update(code, (room) => {
      const state = CornersState.parse(room.game);
      room.game = { ...state, remaining: { ...state.remaining, blue: ["I1"], yellow: [] } };
    });

    ada.send(monominoAt(0, 0));
    expect((await bob.next("roomState")).room.phase).toBe("finished");
    await ada.next("roomState");
    bob.send({ type: "rematch" });
    expect(await bob.next("error")).toMatchObject({ code: "not_host" });

    ada.send({ type: "rematch" });
    const { room } = await bob.next("roomState");
    expect(room.phase).toBe("playing");
    expect(room.game?.board.every((cell) => cell === 0)).toBe(true);
  });

  it("needs a seat first", async () => {
    app = await buildApp({ logLevel: "silent" });
    await app.ready();
    const client = await connect();
    client.send({ type: "pass" });
    expect(await client.next("error")).toMatchObject({ code: "not_in_room" });
  });
});

describe("connection", () => {
  it("survives invalid messages", async () => {
    app = await buildApp({ logLevel: "silent" });
    await app.ready();
    const client = await connect();
    client.ws.send("nonsense");
    client.ws.send('{"type":"placePiece","pieceId":"Q9"}');
    expect(await client.next("error")).toMatchObject({ code: "bad_message" });
    expect(await client.next("error")).toMatchObject({ code: "bad_message" });
    client.send({ type: "ping" });
    expect(await client.next("pong")).toEqual({ type: "pong" });
  });

  it("closes connections that stop pinging", async () => {
    app = await buildApp({ logLevel: "silent", pingTimeoutMs: 100 });
    await app.ready();
    const client = await connect();
    const closed = new Promise((resolve) => client.ws.once("close", resolve));
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      client.send({ type: "ping" });
    }
    expect(client.ws.readyState).toBe(client.ws.OPEN);
    await closed;
  });

  it("warns every connection before the server closes", async () => {
    const { ada, bob } = await twoPlayers();
    const lurker = await connect();
    const closed = Promise.all(
      [ada, bob, lurker].map((c) => new Promise((resolve) => c.ws.once("close", resolve))),
    );
    await app.close();
    await closed;
    for (const c of [ada, bob, lurker]) {
      expect(c.inbox.at(-1)).toEqual({ type: "serverRestarting" });
    }
  });
});
