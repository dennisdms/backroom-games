import { describe, expect, it } from "vitest";
import { COLORS, type CornersState, FOUR_PLAYER, PIECE_IDS } from "./corners/types";
import {
  type ClientMessage,
  parseClientMessage,
  parseServerMessage,
  type RoomState,
  type ServerMessage,
} from "./protocol";

const game: CornersState = {
  variant: FOUR_PLAYER,
  board: Array(FOUR_PLAYER.size ** 2).fill(0),
  remaining: {
    blue: [...PIECE_IDS],
    yellow: [...PIECE_IDS],
    red: [...PIECE_IDS],
    green: [...PIECE_IDS],
  },
  turn: "yellow",
  passes: 0,
  lastMove: { color: "blue", move: { kind: "place", pieceId: "I1", orientation: 0, x: 0, y: 0 } },
};

const room: RoomState = {
  code: "ABCD",
  phase: "playing",
  players: COLORS.map((color, seat) => ({
    seat,
    name: `Player ${seat}`,
    online: true,
    colors: [color],
  })),
  you: 0,
  game,
  version: 3,
};

const clientMessages: ClientMessage[] = [
  { type: "hello", code: "ABCD", name: "Ada" },
  { type: "hello", code: "ABCD", token: "secret", name: "Ada" },
  { type: "startGame" },
  { type: "placePiece", pieceId: "F5", orientation: 7, x: 3, y: 4 },
  { type: "pass" },
  { type: "rematch" },
  { type: "ping" },
];

const serverMessages: ServerMessage[] = [
  { type: "welcome", you: 0, token: "secret", room },
  { type: "roomState", room },
  { type: "roomState", room: { ...room, phase: "lobby", game: null } },
  { type: "error", code: "illegal_move", message: "Not your turn" },
  { type: "playerPresence", seat: 2, online: false },
  { type: "serverRestarting" },
  { type: "pong" },
];

describe("parseClientMessage", () => {
  it.each(clientMessages.map((m) => [m.type, m] as const))("accepts %s", (_, message) => {
    expect(parseClientMessage(JSON.stringify(message))).toEqual(message);
  });

  it.each([
    ["hello without a name", { type: "hello", code: "ABCD" }],
    ["an unknown piece", { type: "placePiece", pieceId: "Q9", orientation: 0, x: 0, y: 0 }],
    ["a negative coordinate", { type: "placePiece", pieceId: "I1", orientation: 0, x: -1, y: 0 }],
    [
      "a fractional orientation",
      { type: "placePiece", pieceId: "I1", orientation: 0.5, x: 0, y: 0 },
    ],
  ])("rejects %s", (_, message) => {
    expect(parseClientMessage(JSON.stringify(message))).toBeNull();
  });

  it("rejects an unknown type", () => {
    expect(parseClientMessage('{"type":"selfDestruct"}')).toBeNull();
  });

  it("rejects invalid JSON", () => {
    expect(parseClientMessage("{not json")).toBeNull();
  });
});

describe("parseServerMessage", () => {
  it.each(serverMessages.map((m, i) => [`${m.type} #${i}`, m] as const))(
    "accepts %s",
    (_, message) => {
      expect(parseServerMessage(JSON.stringify(message))).toEqual(message);
    },
  );

  it("requires the fields of a message", () => {
    expect(parseServerMessage('{"type":"error","code":"bad"}')).toBeNull();
  });

  it("rejects a board cell that isn't a color", () => {
    const board = [5, ...game.board.slice(1)];
    const message = { type: "roomState", room: { ...room, game: { ...game, board } } };
    expect(parseServerMessage(JSON.stringify(message))).toBeNull();
  });

  it("rejects a game missing a color's pieces", () => {
    const { green: _, ...remaining } = game.remaining;
    const message = { type: "roomState", room: { ...room, game: { ...game, remaining } } };
    expect(parseServerMessage(JSON.stringify(message))).toBeNull();
  });
});
