import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import Fastify from "fastify";
import { healthRoutes } from "./http/health";
import { roomRoutes } from "./http/rooms";
import { RoomManager } from "./rooms";
import { wsRoutes } from "./ws/socket";

export interface AppOptions {
  logLevel?: string;
  staticDir?: string | null;
}

export async function buildApp({ logLevel = "info", staticDir = null }: AppOptions = {}) {
  const app = Fastify({ logger: { level: logLevel } });
  const roomManager = new RoomManager();

  await app.register(fastifyWebsocket);
  await app.register(healthRoutes);
  await app.register(roomRoutes, { roomManager });
  await app.register(wsRoutes);

  if (staticDir) {
    await app.register(fastifyStatic, { root: staticDir });
    // The client routes in the browser (e.g. /r/K7QXM), so any other page
    // request gets index.html. Unknown API paths still return a JSON 404.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api/")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "not_found" });
    });
  }

  return app;
}
