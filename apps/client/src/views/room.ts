import type { Placement } from "@backroom/shared";
import { html, nothing, render } from "lit-html";
import { ref } from "lit-html/directives/ref.js";
import { exampleState } from "../games/corners/example";
import {
  cornersTray,
  listenForTrayKeys,
  newTrayLocal,
  type TrayProps,
} from "../games/corners/tray";

// TODO: lobby (#17), and game and results (#20).
export const room = (code: string) => html`
  <h1>Room ${code}</h1>
  <p class="muted">Rooms aren't implemented yet.</p>
  ${import.meta.env.DEV ? preview() : nothing}
  <p><a href="/">Back</a></p>
`;

// Dev-only until rooms can play (#20): a hard-coded game to try the tray on,
// playing whichever color's turn it is. It renders into its own element so
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
    // Once #9 lands, play it too:
    // demo.state = applyMove(demo.state, demo.state.turn, { kind: "place", ...placement });
  },
});

function drawPreview() {
  if (!demo.root) return;
  const { sent } = demo;
  render(
    html`${cornersTray(demoProps())}
    ${sent ? html`<p class="muted">Would send placePiece ${JSON.stringify(sent)}</p>` : nothing}`,
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
