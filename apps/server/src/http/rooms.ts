import {
  type ApiError,
  CreateRoomRequest,
  type CreateRoomResponse,
  parseOptions,
  type RoomInfo,
} from "@backroom/shared";
import type { FastifyError, FastifyInstance } from "fastify";
import { findGame, maxPlayers } from "../games";

export async function roomRoutes(app: FastifyInstance) {
  // Malformed JSON and the like: answer in the API's error shape, not Fastify's.
  app.setErrorHandler<FastifyError>((err, _req, reply) => {
    const status = err.statusCode;
    if (status !== undefined && status >= 400 && status < 500) {
      return reply.code(status).send({ error: "invalid_request" } satisfies ApiError);
    }
    app.log.error(err);
    return reply.code(500).send({ error: "internal_error" } satisfies ApiError);
  });

  app.post("/api/rooms", async (req, reply) => {
    const body = CreateRoomRequest.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_request" } satisfies ApiError);
    }
    const game = findGame(body.data.game);
    if (!game) {
      return reply.code(400).send({ error: "unknown_game" } satisfies ApiError);
    }
    const options = parseOptions(game.options, body.data.options ?? {});
    if (!options) {
      return reply.code(400).send({ error: "invalid_options" } satisfies ApiError);
    }
    const { room, player } = await app.rooms.create({
      gameId: body.data.game,
      maxPlayers: maxPlayers(game),
      name: body.data.name,
      settings: body.data.settings,
      options,
    });
    return reply
      .code(201)
      .send({ code: room.code, playerToken: player.token } satisfies CreateRoomResponse);
  });

  app.get<{ Params: { code: string } }>("/api/rooms/:code", async (req, reply) => {
    // Codes are typed by hand, so accept lowercase and stray spaces.
    const room = await app.rooms.get(req.params.code.trim().toUpperCase());
    if (!room) {
      return reply.code(404).send({ error: "room_not_found" } satisfies ApiError);
    }
    return {
      code: room.code,
      game: room.gameId,
      phase: room.phase,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
    } satisfies RoomInfo;
  });
}
