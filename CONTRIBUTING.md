# Contributing

## Running locally

You need Node 24 (see [`.nvmrc`](.nvmrc)) and pnpm. Run `corepack enable` to get
pnpm (on Node 25+, `npm install -g corepack` first).

```sh
pnpm install
pnpm dev          # http://localhost:5173, reloads on save
```

| Command | What it does |
|---|---|
| `pnpm dev:host` | Like `dev`, but reachable from phones on your network |
| `pnpm check` | Lint, typecheck and unit tests. CI runs this; run it before a PR |
| `pnpm test` / `pnpm test:watch` | Unit tests (Vitest) |
| `pnpm test:e2e` | Browser tests (Playwright). First run `pnpm exec playwright install chromium` |
| `pnpm format` | Fix formatting (Biome) |
| `pnpm build` / `pnpm start` | Production build, served at http://localhost:3000 |

## Running with Docker

You only need Docker.

```sh
docker compose up --build              # production image, http://localhost:3000
docker compose --profile dev up        # dev with hot reload, http://localhost:5173
```

## Project structure

```
packages/shared/   Game rules and WebSocket message schemas. Pure TypeScript, no I/O.
apps/server/       Fastify server: HTTP, WebSocket, rooms
apps/client/       Browser client: TypeScript and lit-html, built with Vite
e2e/               Playwright tests
```

- Game logic goes in `packages/shared` with unit tests next to it (`*.test.ts`),
  never in the client or socket handlers.
- The server is authoritative: clients send moves, the server validates them
  with the shared rules and sends everyone the new state.
- WebSocket messages are defined in `packages/shared/src/protocol.ts`.

## Pull requests

Branch from `main`, run `pnpm check`, and open a PR. CI must pass. PRs are
squash-merged, so the PR title becomes the commit message.

Coding agents read the same conventions from [CLAUDE.md](CLAUDE.md) (also `AGENTS.md`).
