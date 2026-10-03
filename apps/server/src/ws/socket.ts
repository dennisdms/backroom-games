import { parseClientMessage, type ServerMessage } from "@backroom/shared";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

export async function wsRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket) => {
    socket.on("message", (data) => {
      const message = parseClientMessage(data.toString());
      if (!message) {
        send(socket, { type: "error", code: "bad_message", message: "Unknown or invalid message" });
        return;
      }
      switch (message.type) {
        case "ping":
          send(socket, { type: "pong" });
          break;
        // TODO: rooms and moves. See #14.
        case "hello":
        case "startGame":
        case "placePiece":
        case "pass":
        case "rematch":
          send(socket, {
            type: "error",
            code: "not_implemented",
            message: "Rooms aren't implemented yet",
          });
          break;
        default:
          // A type error here means a ClientMessage has no case above.
          message satisfies never;
      }
    });
  });
}

function send(socket: WebSocket, message: ServerMessage) {
  socket.send(JSON.stringify(message));
}
