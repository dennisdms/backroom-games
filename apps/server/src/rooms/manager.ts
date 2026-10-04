import { randomUUID } from "node:crypto";
import type { RoomStore } from "../store/types";
import { generateRoomCode } from "./codes";
import type { Room, RoomPlayer } from "./room";

/** Rooms nobody has touched for this long are removed by the sweep. */
export const ROOM_IDLE_MS = 24 * 60 * 60 * 1000;
/** How often `startSweep` looks for idle rooms by default. */
export const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
/** Gives up creating a room after this many code collisions in a row. */
const MAX_CODE_ATTEMPTS = 20;

export interface RoomManagerOptions {
  store: RoomStore;
  /** Epoch milliseconds. Inject a fake clock in tests. */
  now?: () => number;
  idleMs?: number;
  /** Inject to force code collisions in tests. */
  newCode?: () => string;
}

export interface CreateRoomInput {
  gameId: string;
  /** From the game's `GameModule`. */
  maxPlayers: number;
  /** Display name of the creator, who becomes the host. */
  name: string;
}

export interface JoinRoomInput {
  name: string;
  /** A `playerToken` from an earlier join, to take back that seat. */
  token?: string | undefined;
}

export type JoinError = "room_not_found" | "room_full" | "game_in_progress";

export type JoinResult =
  | { ok: true; room: Room; player: RoomPlayer; rejoined: boolean }
  | { ok: false; error: JoinError };

/**
 * Creates rooms, seats players and expires idle rooms. Knows nothing about any
 * particular game: rooms hold a game id, players and the game's opaque state.
 *
 * Changes to one room are serialized within this process, so concurrent joins
 * can't take the same seat.
 */
export class RoomManager {
  private readonly store: RoomStore;
  private readonly now: () => number;
  private readonly idleMs: number;
  private readonly newCode: () => string;
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor({
    store,
    now = Date.now,
    idleMs = ROOM_IDLE_MS,
    newCode = generateRoomCode,
  }: RoomManagerOptions) {
    this.store = store;
    this.now = now;
    this.idleMs = idleMs;
    this.newCode = newCode;
  }

  /** Creates a room in the lobby with its creator in seat 0 as host. */
  async create({
    gameId,
    maxPlayers,
    name,
  }: CreateRoomInput): Promise<{ room: Room; player: RoomPlayer }> {
    if (!Number.isInteger(maxPlayers) || maxPlayers < 1) {
      throw new RangeError(`maxPlayers must be a positive integer, got ${maxPlayers}`);
    }
    const player: RoomPlayer = { seat: 0, name: name.trim(), token: randomUUID() };
    const now = this.now();
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const room: Room = {
        code: this.newCode(),
        gameId,
        maxPlayers,
        phase: "lobby",
        hostSeat: player.seat,
        players: [player],
        game: null,
        version: 0,
        createdAt: now,
        lastActiveAt: now,
      };
      if (await this.store.insert(room)) return { room, player };
    }
    throw new Error(`No free room code after ${MAX_CODE_ATTEMPTS} attempts`);
  }

  get(code: string): Promise<Room | undefined> {
    return this.store.get(code);
  }

  /**
   * Seats a player. With the token of a player already in the room, returns
   * that player's seat instead (`rejoined`), whatever the phase. Otherwise
   * takes the lowest free seat, which only works in the lobby.
   */
  join(code: string, { name, token }: JoinRoomInput): Promise<JoinResult> {
    return this.withLock(code, async (): Promise<JoinResult> => {
      const room = await this.store.get(code);
      if (!room) return { ok: false, error: "room_not_found" };

      const existing =
        token === undefined ? undefined : room.players.find((p) => p.token === token);
      if (existing) {
        // Reattaching is activity too, so it keeps the room alive.
        room.lastActiveAt = this.now();
        await this.store.save(room);
        return { ok: true, room, player: existing, rejoined: true };
      }

      if (room.phase !== "lobby") return { ok: false, error: "game_in_progress" };
      const seat = lowestFreeSeat(room);
      if (seat === undefined) return { ok: false, error: "room_full" };

      const player: RoomPlayer = { seat, name: name.trim(), token: randomUUID() };
      room.players.push(player);
      room.players.sort((a, b) => a.seat - b.seat);
      this.touch(room);
      await this.store.save(room);
      return { ok: true, room, player, rejoined: false };
    });
  }

  /**
   * Applies `change` to a room and saves it, bumping `version` and
   * `lastActiveAt`. For game moves and phase changes. Returns undefined if
   * the room doesn't exist. If `change` throws, nothing is saved.
   */
  update(code: string, change: (room: Room) => void | Promise<void>): Promise<Room | undefined> {
    return this.withLock(code, async () => {
      const room = await this.store.get(code);
      if (!room) return undefined;
      await change(room);
      this.touch(room);
      await this.store.save(room);
      return room;
    });
  }

  /** Removes rooms idle for longer than `idleMs`. Returns their codes. */
  sweep(): Promise<string[]> {
    return this.store.deleteIdleSince(this.now() - this.idleMs);
  }

  /** Runs `sweep` every `intervalMs`. Returns a function that stops it. */
  startSweep(
    intervalMs = SWEEP_INTERVAL_MS,
    onError: (err: unknown) => void = (err) => console.error("Room sweep failed", err),
  ): () => void {
    const timer = setInterval(() => {
      this.sweep().catch(onError);
    }, intervalMs);
    // Don't keep the process alive just for the sweep.
    timer.unref();
    return () => clearInterval(timer);
  }

  private touch(room: Room) {
    room.version++;
    room.lastActiveAt = this.now();
  }

  /** Runs `fn` after every earlier call for the same room has finished. */
  private async withLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(code) ?? Promise.resolve();
    const run = previous.then(fn);
    const tail = run.catch(() => {});
    this.locks.set(code, tail);
    try {
      return await run;
    } finally {
      if (this.locks.get(code) === tail) this.locks.delete(code);
    }
  }
}

function lowestFreeSeat(room: Room): number | undefined {
  const taken = new Set(room.players.map((p) => p.seat));
  for (let seat = 0; seat < room.maxPlayers; seat++) {
    if (!taken.has(seat)) return seat;
  }
  return undefined;
}
