import type { FastifyInstance } from "fastify";
import type { RoomManager } from "../rooms";

export async function roomRoutes(app: FastifyInstance, opts: { roomManager: RoomManager }) {
  app.post<{ Body: { playerName?: string } }>("/api/rooms", async (req, reply) => {
    const playerName = typeof req.body?.playerName === "string" ? req.body.playerName.trim() : "";
    if (!playerName) {
      return reply.code(400).send({ error: "missing_name", message: "playerName is required" });
    }

    const { code, token } = opts.roomManager.createRoom(playerName);
    return reply.code(201).send({ code, token });
  });
}
