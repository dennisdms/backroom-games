import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface Config {
  port: number;
  host: string;
  logLevel: string;
  /** Directory of the built client to serve, or null to serve no static files (dev). */
  staticDir: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Locally the built client sits next to the server in the monorepo. The
  // Docker image sets STATIC_DIR instead.
  const staticDir = env.STATIC_DIR ?? fileURLToPath(new URL("../../client/dist", import.meta.url));
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? "0.0.0.0",
    logLevel: env.LOG_LEVEL ?? "info",
    staticDir: existsSync(staticDir) ? staticDir : null,
  };
}
