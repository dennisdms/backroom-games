# Contributing

## Setup

You need Node 24 (see [`.nvmrc`](.nvmrc)) and pnpm.

```sh
corepack enable   # provides pnpm; on Node 25+ run `npm install -g corepack` first
pnpm install
pnpm dev          # http://localhost:5173
```

pnpm switches itself to the version pinned in `package.json`, so everyone runs
the same one.

**No Node?** `docker compose --profile dev up` runs the dev setup in a container
with hot reload, also at http://localhost:5173. It's slower than running it
directly.

**Port 3000 taken?** Copy `.env.example` to `.env` and change `PORT`. Both the
server and the dev proxy read it.

## Scripts

Run these from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Server and client with hot reload at http://localhost:5173 |
| `pnpm dev:host` | Same, reachable from other devices on your network |
| `pnpm test` | All unit tests (Vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | Browser tests (Playwright) against a production build |
| `pnpm lint` | Lint and format check (Biome) |
| `pnpm format` | Fix formatting and safe lint issues |
| `pnpm typecheck` | Type-check every package |
| `pnpm build` | Production build of the client and server |
| `pnpm start` | Run the production build at http://localhost:3000 |
| `pnpm check` | Lint, typecheck and unit tests: what CI runs, so run it before opening a PR |

## Project structure

```
packages/shared/   Game rules and the WebSocket protocol. Pure TypeScript, no I/O.
  src/corners/     Corners rules: pieces, legal moves, scoring
  src/protocol.ts  Message schemas (Zod), shared by client and server
apps/server/       Fastify server: HTTP API, WebSocket, rooms
apps/client/       Browser client: TypeScript and lit-html, built with Vite
e2e/               Playwright tests
```

**The one rule:** game logic goes in `packages/shared`, with unit tests. Never
put rules in the client or in socket handlers. The server runs the shared rules
to decide what's legal; the client runs the same code only to preview moves.

The server is authoritative. Clients send what they want to do (`placePiece`),
the server validates and applies it, then sends everyone the full new state.

## Tests

- Tests sit next to the code they test, as `*.test.ts`.
- Every rule in `packages/shared` gets unit tests. That's the code most worth
  testing, and it needs no server or browser.
- Run one file: `pnpm vitest run packages/shared/src/protocol.test.ts`
- Run tests matching a name: `pnpm vitest run -t "ping"`
- Browser tests: `pnpm test:e2e`. Add `--ui` to watch and step through them.
  The first time, install a browser with `pnpm exec playwright install chromium`.

## The WebSocket protocol

Messages are JSON objects with a `type` field. Their schemas live in
[`packages/shared/src/protocol.ts`](packages/shared/src/protocol.ts). To add a
message, add a schema to `ClientMessage` or `ServerMessage`, then handle it in
`apps/server/src/ws/` or `apps/client/src/socket.ts`. TypeScript tells you
which `switch` statements need a new case.

## Making a change

1. Branch from `main`.
2. Make the change, with tests.
3. Run `pnpm check`.
4. Open a pull request. CI runs the checks, the browser tests and a Docker build.
5. Merges are squashed, so the PR title becomes the commit message. Make it
   describe the change.

Once deployment is set up, merging to `main` deploys to the live site.

## Naming

The first game is called **Corners** everywhere: code, UI, URLs and docs. It
plays like a well-known commercial game, but the repo is public and that name
is a trademark, so we don't use it.

## AI tools

[CLAUDE.md](CLAUDE.md) (also available as `AGENTS.md`) holds these conventions
in a form coding agents read automatically. If you change a convention here,
update it there too.
