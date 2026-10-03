import { html } from "lit-html";

// TODO: lobby, game and results for a room. See research notes §1.3.
export const room = (code: string) => html`
  <h1>Room ${code}</h1>
  <p class="muted">Rooms aren't implemented yet.</p>
  <p><a href="/">Back</a></p>
`;
