import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import Fastify from "fastify";
import { healthRoutes } from "./http/health";
import { roomRoutes } from "./http/rooms";
import { RoomManager } from "./rooms";
import { InMemoryRoomStore } from "./store";
import { PING_TIMEOUT_MS, warnBeforeClose, wsRoutes } from "./ws/socket";

declare module "fastify" {
  interface FastifyInstance {
    /** The app's rooms, shared by the HTTP API and the WebSocket. */
    rooms: RoomManager;
  }
}

export interface AppOptions {
  logLevel?: string;
  staticDir?: string | null;
  /** Defaults to a RoomManager over an InMemoryRoomStore. Inject one in tests. */
  rooms?: RoomManager;
  /** Closes WebSockets that send no ping for this long. Shorten it in tests. */
  pingTimeoutMs?: number;
}

export async function buildApp({
  logLevel = "info",
  staticDir = null,
  rooms = new RoomManager({ store: new InMemoryRoomStore() }),
  pingTimeoutMs = PING_TIMEOUT_MS,
}: AppOptions = {}) {
  const app = Fastify({ logger: { level: logLevel } });

  app.decorate("rooms", rooms);
  const stopSweep = rooms.startSweep(undefined, (e) => app.log.error(e));
  app.addHook("onClose", async () => stopSweep());

  warnBeforeClose(app);
  await app.register(fastifyWebsocket);
  await app.register(healthRoutes);
  await app.register(roomRoutes);
  await app.register(wsRoutes, { pingTimeoutMs });

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
