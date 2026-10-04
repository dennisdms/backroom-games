import { randomInt } from "node:crypto";

/** No 0/O or 1/I/L: codes are read aloud and typed on phones. */
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 5;

/** A random room code. Uniqueness is up to the caller, see `RoomManager.create`. */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}
