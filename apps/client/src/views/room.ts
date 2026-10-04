import { html, nothing } from "lit-html";
import { cornersBoard } from "../games/corners/board";
import { exampleState } from "../games/corners/example";

// TODO: lobby (#17), and game and results (#20).
export const room = (code: string) => html`
  <h1>Room ${code}</h1>
  <p class="muted">Rooms aren't implemented yet.</p>
  ${import.meta.env.DEV ? preview() : nothing}
  <p><a href="/">Back</a></p>
`;

// Dev-only until rooms can play (#20): the board with a hard-coded game.
const preview = () => html`
  <p class="muted">Board preview (dev only):</p>
  ${cornersBoard(exampleState())}
`;
