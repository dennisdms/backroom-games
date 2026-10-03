import { defineConfig, loadEnv } from "vite";

// In dev, Vite serves the client and forwards API and WebSocket traffic to the
// server, so the browser sees one origin, as it does in production. PORT comes
// from the environment or the root .env, the same place the server reads it.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, "../..", ""), ...process.env };
  const server = `http://localhost:${env.PORT ?? 3000}`;

  return {
    server: {
      port: 5173,
      proxy: {
        "/api": server,
        "/healthz": server,
        "/ws": { target: server, ws: true },
      },
    },
  };
});
