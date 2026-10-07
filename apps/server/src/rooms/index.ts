// Rooms: RoomManager, the Room record (lobby -> playing -> finished) and the
// room code generator.
export { generateRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./codes";
export {
  type CreateRoomInput,
  type JoinError,
  type JoinResult,
  type JoinRoomInput,
  ROOM_IDLE_MS,
  RoomManager,
  type RoomManagerOptions,
  SWEEP_INTERVAL_MS,
  type UpdateOptions,
} from "./manager";
export type { Room, RoomPhase, RoomPlayer } from "./room";
