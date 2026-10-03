import { html } from "lit-html";

// TODO: lobby (#17), and game and results (#20).
export const room = (code: string) => html`
  <h1>Room ${code}</h1>
  <p class="muted">Rooms aren't implemented yet.</p>
  <p><a href="/">Back</a></p>
`;
