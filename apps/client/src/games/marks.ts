import { html, nothing, svg } from "lit-html";

// A small mark for each game in the landing page's list, drawn in the piece
// colors. Games without one get none.

/** Corners: a piece in each corner of a board, in its player's color. */
const corners = () => html`<svg class="game-mark" viewBox="0 0 7 7" aria-hidden="true">
  <rect class="game-mark-board" width="7" height="7" />
  ${[
    ["blue", "M0 0h2v1h-1v1h-1z"],
    ["yellow", "M5 0h2v2h-1v-1h-1z"],
    ["red", "M7 7h-2v-1h1v-1h1z"],
    ["green", "M0 7v-2h1v1h1v1z"],
  ].map(([color, d]) => svg`<path d=${d} fill="var(--color-${color})" />`)}
</svg>`;

const marks: Record<string, () => ReturnType<typeof html>> = { corners };

export const gameMark = (id: string) => marks[id]?.() ?? nothing;
