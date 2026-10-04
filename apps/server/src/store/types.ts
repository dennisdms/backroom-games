import type { Room } from "../rooms/room";

/**
 * Where rooms live. Async so a database can implement it later. Stores return
 * copies, so changes to a room stick only once it is saved.
 */
export interface RoomStore {
  get(code: string): Promise<Room | undefined>;
  /** Adds a new room. Returns false, and changes nothing, if the code is taken. */
  insert(room: Room): Promise<boolean>;
  /** Replaces an existing room. Does nothing if the room is gone. */
  save(room: Room): Promise<void>;
  delete(code: string): Promise<void>;
  /** Deletes the rooms whose `lastActiveAt` is before `cutoff` and returns their codes. */
  deleteIdleSince(cutoff: number): Promise<string[]>;
}
