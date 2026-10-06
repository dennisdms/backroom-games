import {
  type ClientMessage,
  CreateRoomRequest,
  MAX_NAME_LENGTH,
  parseClientMessage,
  type ServerMessage,
} from "@backroom/shared";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { findGame, type GameModule } from "../games";
import type { JoinError, Room } from "../rooms";
import { roomStateFor } from "./room-state";
import { type Client, Sessions } from "./sessions";

// The game session protocol. Clients send intents; the server checks them with
// the room's GameModule, saves the room (bumping its version) and sends every
// connected player the whole new RoomState as they may see it.

/** Connections that send no `ping` for this long are closed. */
export const PING_TIMEOUT_MS = 60_000;

export interface WsOptions {
  pingTimeoutMs?: number;
}

/** A message the client got wrong. Sent back as `error`, never crashes the socket. */
class ClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const Name = CreateRoomRequest.shape.name;

const joinErrors: Record<JoinError, string> = {
  room_not_found: "There's no room with that code",
  room_full: "The room is full",
  game_in_progress: "The game has already started",
};

/** A seat's change to the room. Throw a ClientError to reject it; nothing is saved then. */
type Change = (room: Room, game: GameModule, seat: number) => void;

/**
 * Tells every connection the server is going away, so clients can say so
 * instead of showing a dead board. Call it before registering
 * @fastify/websocket: its own preClose hook then closes the sockets, after this
 * message.
 */
export function warnBeforeClose(app: FastifyInstance) {
  app.addHook("preClose", async () => {
    for (const socket of app.websocketServer.clients) send(socket, { type: "serverRestarting" });
  });
}

export async function wsRoutes(
  app: FastifyInstance,
  { pingTimeoutMs = PING_TIMEOUT_MS }: WsOptions,
) {
  const sessions = new Sessions();

  app.get("/ws", { websocket: true }, (socket) => {
    const client: Client = { socket, at: null };

    let timer = setTimeout(() => socket.terminate(), pingTimeoutMs);
    const heard = () => {
      clearTimeout(timer);
      timer = setTimeout(() => socket.terminate(), pingTimeoutMs);
    };

    // One message at a time per connection, so a move sent right after
    // `hello` sees the seat `hello` took.
    let queue = Promise.resolve();
    const enqueue = (task: () => Promise<void>) => {
      queue = queue.then(task).catch((err: unknown) => {
        app.log.error(err, "WebSocket message failed");
        send(socket, { type: "error", code: "internal_error", message: "Something went wrong" });
      });
    };

    socket.on("message", (data) => {
      enqueue(async () => {
        try {
          await handle(client, data.toString(), heard);
        } catch (err) {
          if (!(err instanceof ClientError)) throw err;
          send(socket, { type: "error", code: err.code, message: err.message });
        }
      });
    });

    socket.on("close", () => {
      clearTimeout(timer);
      enqueue(async () => leave(client));
    });
  });

  async function handle(client: Client, raw: string, heard: () => void) {
    const message = parseClientMessage(raw);
    if (!message) throw new ClientError("bad_message", "Unknown or invalid message");
    switch (message.type) {
      case "ping":
        heard();
        send(client.socket, { type: "pong" });
        break;
      case "hello":
        await hello(client, message);
        break;
      case "startGame":
        await change(client, (room, game, seat) => {
          if (seat !== room.hostSeat) throw new ClientError("not_host", "Only the host can start");
          if (room.phase !== "lobby") throw wrongPhase("The game has already started");
          start(room, game);
        });
        break;
      case "placePiece": {
        const { pieceId, orientation, x, y } = message;
        await move(client, { kind: "place", pieceId, orientation, x, y });
        break;
      }
      case "pass":
        await move(client, { kind: "pass" });
        break;
      case "rematch":
        await change(client, (room, game, seat) => {
          if (seat !== room.hostSeat)
            throw new ClientError("not_host", "Only the host can rematch");
          if (room.phase !== "finished") throw wrongPhase("The game isn't over yet");
          start(room, game);
        });
        break;
      default:
        // A type error here means a ClientMessage has no case above.
        message satisfies never;
    }
  }

  async function hello(client: Client, message: Extract<ClientMessage, { type: "hello" }>) {
    const name = Name.safeParse(message.name);
    if (!name.success)
      throw new ClientError("bad_name", `Enter a name of up to ${MAX_NAME_LENGTH} characters`);
    const joined = await app.rooms.join(message.code.trim().toUpperCase(), {
      name: name.data,
      token: message.token,
    });
    if (!joined.ok) throw new ClientError(joined.error, joinErrors[joined.error]);

    const { code } = joined.room;
    const { seat, token } = joined.player;
    const same = client.at?.code === code && client.at.seat === seat;
    if (!same) leave(client);
    const cameOnline = !same && sessions.attach(client, code, seat);

    // Read the room again now that this client gets broadcasts, so no change
    // in between is missed.
    const room = (await app.rooms.get(code)) ?? joined.room;
    send(client.socket, { type: "welcome", you: seat, token, room: stateFor(room, seat) });
    if (!joined.rejoined) broadcast(room, client);
    if (cameOnline) presence(code, seat, true, client);
  }

  function move(client: Client, input: unknown) {
    return change(client, (room, game, seat) => {
      if (room.phase !== "playing") throw wrongPhase("The game isn't being played");
      const parsed = game.parseMove(input);
      if (parsed === null) throw new ClientError("bad_move", "That isn't a move in this game");
      const check = game.validate(room.game, seat, parsed);
      if (!check.ok) throw new ClientError("illegal_move", `Illegal move: ${check.reason}`);
      room.game = game.apply(room.game, seat, parsed);
      if (game.isOver(room.game)) room.phase = "finished";
    });
  }

  async function change(client: Client, mutate: Change) {
    const { at } = client;
    if (!at) throw new ClientError("not_in_room", "Send hello first");
    const room = await app.rooms.update(at.code, (r) => mutate(r, gameOf(r), at.seat));
    if (!room) throw new ClientError("room_not_found", joinErrors.room_not_found);
    broadcast(room);
  }

  function leave(client: Client) {
    const { at } = client;
    if (at && sessions.detach(client)) presence(at.code, at.seat, false);
  }

  function stateFor(room: Room, seat: number) {
    return roomStateFor(room, gameOf(room), seat, (s) => sessions.online(room.code, s));
  }

  /** Sends everyone in the room, except `skip`, their view of it. */
  function broadcast(room: Room, skip?: Client) {
    for (const c of sessions.clients(room.code)) {
      if (c === skip || !c.at) continue;
      send(c.socket, { type: "roomState", room: stateFor(room, c.at.seat) });
    }
  }

  function presence(code: string, seat: number, online: boolean, skip?: Client) {
    for (const c of sessions.clients(code)) {
      if (c !== skip) send(c.socket, { type: "playerPresence", seat, online });
    }
  }
}

/** Starts a new game with everyone seated. */
function start(room: Room, game: GameModule) {
  if (!game.playerCounts.includes(room.players.length)) {
    const counts = game.playerCounts.join(" or ");
    throw new ClientError("bad_player_count", `This game needs ${counts} players`);
  }
  room.game = game.init(
    room.players.map((p) => p.seat),
    undefined,
  );
  room.phase = "playing";
}

function gameOf(room: Room): GameModule {
  const game = findGame(room.gameId);
  if (!game) throw new Error(`Room ${room.code} plays unknown game ${room.gameId}`);
  return game;
}

const wrongPhase = (message: string) => new ClientError("wrong_phase", message);

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}
