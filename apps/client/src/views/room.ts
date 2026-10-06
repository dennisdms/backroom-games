import { applyMove, isGameOver, type Placement, type RoomState } from "@backroom/shared";
import { html, nothing, render } from "lit-html";
import { ref } from "lit-html/directives/ref.js";
import { exampleState } from "../games/corners/example";
import {
  cornersTray,
  listenForTrayKeys,
  newTrayLocal,
  type TrayProps,
} from "../games/corners/tray";
import type { Session } from "../session";

// TODO: lobby (#17), and game and results (#20).
export const room = (code: string, session: Session | null) => html`
  <h1>Room ${code}</h1>
  ${session?.error ? html`<p role="alert">${session.error}</p>` : nothing}
  ${session?.room ? players(session.room) : html`<p class="muted">Joining…</p>`}
  ${import.meta.env.DEV ? preview() : nothing}
  <p><a href="/">Back</a></p>
`;

/** Who's in the room, until the lobby (#17) shows it properly. */
const players = (room: RoomState) => html`
  <p data-testid="players">
    Players:
    ${room.players
      .map((p) => `${p.name}${p.seat === room.you ? " (you)" : ""}${p.online ? "" : " (offline)"}`)
      .join(", ")}
  </p>
`;

// Dev-only until rooms can play (#20): a hard-coded game to try the tray on,
// playing whichever color's turn it is, hot-seat. It renders into its own element so
// its UI changes redraw only the preview.
const demo = {
  state: exampleState(),
  tray: newTrayLocal(),
  sent: null as Placement | null,
  root: null as HTMLElement | null,
  listening: false,
};

const demoProps = (): TrayProps => ({
  state: demo.state,
  color: demo.state.turn,
  local: demo.tray,
  draw: drawPreview,
  onConfirm: (placement) => {
    demo.sent = placement;
    demo.state = applyMove(demo.state, { kind: "place", ...placement });
  },
});

const resetDemo = () => {
  demo.state = exampleState();
  demo.tray = newTrayLocal();
  demo.sent = null;
  drawPreview();
};

function drawPreview() {
  if (!demo.root) return;
  const { sent } = demo;
  render(
    html`${cornersTray(demoProps())}
    ${sent ? html`<p class="muted">Would send placePiece ${JSON.stringify(sent)}</p>` : nothing}
    ${isGameOver(demo.state) ? html`<p>Game over.</p>` : nothing}
    <p><button @click=${resetDemo}>Reset preview</button></p>`,
    demo.root,
  );
}

const mountPreview = (element?: Element) => {
  demo.root = element instanceof HTMLElement ? element : null;
  if (!demo.listening) listenForTrayKeys(() => (demo.root ? demoProps() : null));
  demo.listening = true;
  drawPreview();
};

const preview = () => html`
  <p class="muted">Board preview (dev only):</p>
  <div ${ref(mountPreview)}></div>
`;
