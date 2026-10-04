import type { Room } from "../rooms/room";
import type { RoomStore } from "./types";

/** Keeps rooms in a `Map`. They are lost when the server restarts. */
export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, Room>();

  async get(code: string): Promise<Room | undefined> {
    const room = this.rooms.get(code);
    return room && structuredClone(room);
  }

  async insert(room: Room): Promise<boolean> {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, structuredClone(room));
    return true;
  }

  async save(room: Room): Promise<void> {
    if (this.rooms.has(room.code)) this.rooms.set(room.code, structuredClone(room));
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code);
  }

  async deleteIdleSince(cutoff: number): Promise<string[]> {
    const removed: string[] = [];
    for (const [code, room] of this.rooms) {
      if (room.lastActiveAt < cutoff) {
        this.rooms.delete(code);
        removed.push(code);
      }
    }
    return removed;
  }
}
