// Corners UI: the SVG board. The piece tray (tray.ts) draws the piece being
// placed on top of it through `overlay`.
import {
  COLORS,
  type Color,
  type CornersState,
  cellOf,
  cornerCandidates,
  isGameOver,
  placementSquares,
  type Square,
} from "@backroom/shared";
import { html, nothing, svg } from "lit-html";

/** Squares drawn over the board, e.g. the ghost of the piece being placed. */
export type BoardOverlay = {
  squares: readonly Square[];
  color: Color;
  /** Drawn in gray instead of `color` (e.g. an illegal placement). Defaults to valid. */
  invalid?: boolean;
};

export type BoardOptions = { overlay?: BoardOverlay | undefined };

/**
 * Where the color to move may start: the empty board corners, until its first
 * piece is down. None for the other colors, and none once the game is over.
 */
export const startCorners = (state: CornersState): { color: Color; square: Square }[] => {
  const color = state.turn;
  if (state.board.includes(cellOf(color)) || isGameOver(state)) return [];
  return cornerCandidates(state, color).map((square) => ({ color, square }));
};

/**
 * The board as an SVG drawn from `state`. The viewBox is one unit per square,
 * so square (x, y) sits at x..x+1, y..y+1, and each square carries `data-x` and
 * `data-y`. `squareAt` maps a pointer position back to a square.
 */
export const cornersBoard = (state: CornersState, { overlay }: BoardOptions = {}) => {
  const { size } = state.variant;
  const lastSquares =
    state.lastMove?.move.kind === "place" ? placementSquares(state.lastMove.move) : null;

  return html`<svg
    class="corners-board"
    viewBox="0 0 ${size} ${size}"
    role="img"
    aria-label="Corners board"
  >
    ${state.board.map((cell, i) => {
      const x = i % size;
      const y = Math.floor(i / size);
      const color = COLORS[cell - 1];
      return svg`<rect
        class="square"
        x=${x}
        y=${y}
        width="1"
        height="1"
        data-x=${x}
        data-y=${y}
        fill=${color ? `var(--color-${color})` : "var(--board-empty)"}
      />`;
    })}
    ${startCorners(state).map(
      ({ color, square: [x, y] }) => svg`<circle
        class="start"
        data-color=${color}
        cx=${x + 0.5}
        cy=${y + 0.5}
        r="0.3"
        fill="var(--color-${color})"
      />`,
    )}
    ${lastSquares ? svg`<path class="last-move" d=${outlinePath(lastSquares)} />` : nothing}
    ${
      overlay
        ? svg`<g
          class="overlay ${overlay.invalid ? "invalid" : ""}"
          fill=${overlay.invalid ? "var(--ghost-illegal)" : `var(--color-${overlay.color})`}
        >
          ${overlay.squares.map(([x, y]) => svg`<rect x=${x} y=${y} width="1" height="1" />`)}
        </g>`
        : nothing
    }
  </svg>`;
};

/**
 * An SVG path tracing the outer edges of `squares`: every side of a square
 * that doesn't border another square in the set.
 */
export const outlinePath = (squares: readonly Square[]): string => {
  const has = new Set(squares.map(([x, y]) => `${x},${y}`));
  const edges: string[] = [];
  for (const [x, y] of squares) {
    if (!has.has(`${x},${y - 1}`)) edges.push(`M${x} ${y}h1`);
    if (!has.has(`${x + 1},${y}`)) edges.push(`M${x + 1} ${y}v1`);
    if (!has.has(`${x},${y + 1}`)) edges.push(`M${x} ${y + 1}h1`);
    if (!has.has(`${x - 1},${y}`)) edges.push(`M${x} ${y}v1`);
  }
  return edges.join("");
};

/**
 * The square under a point, given the board's on-screen rectangle (from
 * `getBoundingClientRect()`), or null when the point is off the board.
 */
export const squareAt = (
  rect: { left: number; top: number; width: number; height: number },
  size: number,
  clientX: number,
  clientY: number,
): Square | null => {
  const x = Math.floor(((clientX - rect.left) / rect.width) * size);
  const y = Math.floor(((clientY - rect.top) / rect.height) * size);
  return x >= 0 && x < size && y >= 0 && y < size ? [x, y] : null;
};
