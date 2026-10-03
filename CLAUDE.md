# Backroom Games

Browser board games for a group of friends: create a room, share the code,
play. The first game is **Corners**. Human-facing docs are in README.md and
CONTRIBUTING.md; this file is the same conventions for coding agents.

## Commands

- `pnpm check`: lint, typecheck and unit tests. Run it before saying a change is done.
- `pnpm format`: fix formatting (Biome). Don't hand-format.
- `pnpm test:e2e`: Playwright against a production build.
- `pnpm vitest run <file>`: run one test file.

## Layout

- `packages/shared`: game rules and the WebSocket protocol (Zod). Pure functions, no I/O.
- `apps/server`: Fastify and `@fastify/websocket`. Bundled into one file by `build.ts`.
- `apps/client`: TypeScript and lit-html, built with Vite. No framework.

## Rules

- **Game logic lives only in `packages/shared`**, with unit tests next to it
  (`*.test.ts`). The client and socket handlers call it; they never reimplement it.
- **The server is authoritative.** Clients send intents (`placePiece`); the
  server validates with the shared rules, applies, and broadcasts the full state
  with a `version`. No diffs, no client-side state changes.
- **Every WebSocket message has a Zod schema** in `packages/shared/src/protocol.ts`.
  Handle new messages in the server's `switch`; its `satisfies never` default
  fails typecheck until you do.
- **Call the game "Corners"**: in code, UI, URLs, comments and docs. Never use
  the trademarked name of the commercial game it's based on.
- Rooms, games and storage go in `apps/server/src/{rooms,games,store}`, behind
  two planned interfaces: `GameModule` (one per game) and `RoomStore` (in memory
  now, Postgres later). Keep the room system game-agnostic. `GameModule.view()`
  gives each player their own view of the state, for games with hidden information.
- TypeScript is strict with `noUncheckedIndexedAccess`. Don't use `any` or `!`
  to silence errors; handle the `undefined`.
- Imports within a package are extensionless.

## Client pattern

No components, hooks or state libraries. State is plain variables; any change
calls `draw()`; views are functions returning lit-html templates.

```ts
import { html, render } from "lit-html";

let state: RoomState;                          // from the server, replaced on every update
const local = { piece: null as PieceId | null }; // UI-only state

const draw = () => render(view(state, local), root);

const view = (s: RoomState, l: typeof local) => html`
  <h1>Room ${s.code}</h1>
  <button @click=${() => { l.piece = null; draw(); }}>Clear</button>
`;
```

- Event handlers use `@click=${fn}`; attributes `.prop=${x}` or `attr=${x}`.
- Board rendering is SVG (`svg` tagged templates from lit-html).
- Styles are plain CSS in `apps/client/src/styles/`, with colors as custom
  properties (`--color-blue`, ...). No CSS frameworks.
