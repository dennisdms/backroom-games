# Backroom Games

Browser board games for friends: create a room, share the code, play. See
CONTRIBUTING.md for setup and structure.

## Commands

- `pnpm check`: lint, typecheck, unit tests. Run before calling a change done.
- `pnpm format`: fix formatting. Don't hand-format.
- `pnpm vitest run <file>`: one test file. `pnpm test:e2e`: Playwright.

## Rules

- Game logic lives only in `packages/shared`, with `*.test.ts` next to it.
- The server is authoritative: clients send intents, the server validates with
  the shared rules and broadcasts the full state with a `version`.
- Every WebSocket message has a Zod schema in `packages/shared/src/protocol.ts`.
  The server's `switch` has a `satisfies never` default that fails typecheck
  until a new message is handled.
- Keep rooms game-agnostic: games plug in through a `GameModule`, storage
  through a `RoomStore` (both planned in `apps/server/src/`).
- No `any` or `!` to silence strict-mode errors. Imports are extensionless.

## Client pattern

No framework. State is plain variables, any change calls `draw()`, and views
are functions returning lit-html templates. Boards are SVG; styles are plain CSS.

```ts
import { html, render } from "lit-html";

let state: RoomState;                            // from the server
const local = { piece: null as PieceId | null }; // UI-only

const draw = () => render(view(state, local), root);

const view = (s: RoomState, l: typeof local) => html`
  <h1>Room ${s.code}</h1>
  <button @click=${() => { l.piece = null; draw(); }}>Clear</button>
`;
```
