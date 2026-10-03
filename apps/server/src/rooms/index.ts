import { randomBytes } from "node:crypto";

export interface Player {
  name: string;
  index: number;
}

export interface Room {
  code: string;
  players: Map<string, Player>;
  createdAt: Date;
}

const CODE_LENGTH = 5;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
const TOKEN_BYTES = 16;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const b = bytes[i] as number;
    code += CODE_CHARS[b % CODE_CHARS.length];
  }
  return code;
}

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  /** Creates a room and adds the first player. Returns the room code and player token. */
  createRoom(playerName: string): { code: string; token: string } {
    let code: string;
    do {
      code = generateCode();
    } while (this.rooms.has(code));

    const token = generateToken();
    const room: Room = {
      code,
      players: new Map([[token, { name: playerName, index: 0 }]]),
      createdAt: new Date(),
    };
    this.rooms.set(code, room);
    return { code, token };
  }

  /** Adds a player to an existing room. Returns the player token, or null if the room doesn't exist. */
  joinRoom(code: string, playerName: string): { token: string } | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const token = generateToken();
    room.players.set(token, { name: playerName, index: room.players.size });
    return { token };
  }

  /** Returns a room by code, or undefined. */
  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /** Checks whether a room with the given code exists. */
  hasRoom(code: string): boolean {
    return this.rooms.has(code);
  }
}
