// Corners UI: playing a piece. The tray of pieces (played ones grayed out), the rotate and
// flip controls, and the ghost of the piece on the board. Clicking the board
// plays the piece there; on touch, the first tap previews it.
import {
  type Color,
  type CornersState,
  checkMove,
  flipOrientation,
  type IllegalReason,
  ORIENTATIONS,
  PIECE_IDS,
  PIECES,
  type PieceId,
  type Placement,
  placementSquares,
  rotateOrientation,
  type Square,
} from "@backroom/shared";
import { html, svg, type TemplateResult } from "lit-html";
import { type BoardOverlay, cornersBoard, squareAt } from "./board";

/** The tray's UI-only state. Whoever shows the tray owns it and passes it in. */
export type TrayLocal = {
  piece: PieceId | null;
  /** An index into `ORIENTATIONS[piece]`. */
  orientation: number;
  /** The square under the mouse or pen, which the ghost follows. */
  hover: Square | null;
  /** Where a tap put the ghost. Touch has no hover; tapping it again plays it. */
  tapped: Square | null;
  /** Whether the last press on the board was a touch. */
  touch: boolean;
};

export const newTrayLocal = (): TrayLocal => ({
  piece: null,
  orientation: 0,
  hover: null,
  tapped: null,
  touch: false,
});

export type TrayProps = {
  state: CornersState;
  /**
   * The color this player places. When it isn't its turn, pieces can still be
   * picked, turned and flipped, but not put on the board.
   */
  color: Color;
  local: TrayLocal;
  /** Redraws after `local` changes. */
  draw: () => void;
  /** Called with the move the player made, e.g. to send `placePiece`. */
  onConfirm: (placement: Placement) => void;
};

export type TrayAction = "rotate-cw" | "rotate-ccw" | "flip" | "cancel";

/**
 * Where a piece goes when `anchor` is the square under the pointer: the top
 * left of the piece's bounding box goes on it, so pointing at a board corner
 * puts the piece in that corner. Then shifted to stay on a `size` board.
 */
export const ghostPlacement = (
  pieceId: PieceId,
  orientation: number,
  [ax, ay]: Square,
  size: number,
): Placement => {
  const shape = ORIENTATIONS[pieceId][orientation] ?? PIECES[pieceId];
  const width = Math.max(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) + 1;
  const clamp = (n: number, span: number) => Math.max(0, Math.min(n, size - span));
  return {
    pieceId,
    orientation: ORIENTATIONS[pieceId][orientation] ? orientation : 0,
    x: clamp(ax, width),
    y: clamp(ay, height),
  };
};

/** The tray action for a key press, or null. R/E rotate, F flips, Escape backs out. */
export const keyAction = (event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): TrayAction | null => {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  switch (event.key.toLowerCase()) {
    case "r":
      return "rotate-cw";
    case "e":
      return "rotate-ccw";
    case "f":
      return "flip";
    case "escape":
      return "cancel";
    default:
      return null;
  }
};

/** Applies `action` to `local`. Returns whether anything changed. "cancel" puts the piece back. */
export const act = (local: TrayLocal, action: TrayAction): boolean => {
  const { piece } = local;
  switch (action) {
    case "rotate-cw":
    case "rotate-ccw":
      if (!piece) return false;
      local.orientation = rotateOrientation(
        piece,
        local.orientation,
        action === "rotate-cw" ? 1 : -1,
      );
      return true;
    case "flip":
      if (!piece) return false;
      local.orientation = flipOrientation(piece, local.orientation);
      return true;
    case "cancel":
      if (!piece) return false;
      Object.assign(local, { piece: null, orientation: 0, tapped: null });
      return true;
    default:
      return action satisfies never;
  }
};

/** Picks `pieceId`, or puts it back if it's already picked. */
const select = (local: TrayLocal, pieceId: PieceId) => {
  if (local.piece === pieceId) Object.assign(local, { piece: null, orientation: 0, tapped: null });
  else Object.assign(local, { piece: pieceId, orientation: 0 });
};

/**
 * Handles the tray keys on `window`. Attach it once: `current` returns the tray
 * shown right now, or null when there is none. Ignores keys typed into fields.
 * Returns a function that detaches it.
 */
export const listenForTrayKeys = (current: () => TrayProps | null) => {
  const onKeyDown = (event: KeyboardEvent) => {
    const props = current();
    const action = keyAction(event);
    if (!props || !action || isTyping(event.target)) return;
    if (act(props.local, action)) {
      event.preventDefault();
      props.draw();
    }
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.matches("input, textarea, select"));

/** The picked piece, unless `color` has played it since. */
const pickedPiece = (state: CornersState, color: Color, local: TrayLocal) =>
  local.piece && state.remaining[color].includes(local.piece) ? local.piece : null;

/**
 * A click or tap on `square`. Plays the picked piece there if that's legal, and
 * otherwise does nothing. Touch has no hover, so a tap first moves the ghost
 * there and a second tap on the same square plays it. Returns the move to
 * play, or null.
 */
export const pressBoard = (
  state: CornersState,
  color: Color,
  local: TrayLocal,
  square: Square,
): Placement | null => {
  const piece = pickedPiece(state, color, local);
  if (state.turn !== color || !piece) return null;
  if (local.touch && !sameSquare(square, local.tapped)) {
    local.tapped = square;
    return null;
  }
  const placement = ghostPlacement(piece, local.orientation, square, state.variant.size);
  if (!checkMove(state, color, { kind: "place", ...placement }).ok) return null;
  Object.assign(local, { piece: null, orientation: 0, tapped: null });
  return placement;
};

const sameSquare = (a: Square | null, b: Square | null) =>
  a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1]);

const reasonText: Record<IllegalReason, string> = {
  "not-your-turn": "It isn't your turn.",
  "piece-used": "You've already played that piece.",
  "unknown-orientation": "That piece can't be turned that way.",
  "off-board": "The piece has to fit on the board.",
  occupied: "Those squares are taken.",
  "misses-corner": "Your first piece has to cover a corner.",
  "no-corner-contact": "It has to touch one of your pieces corner to corner.",
  "touches-own-edge": "It can't share an edge with your own pieces.",
  "can-still-place": "You can't pass while you can still place a piece.",
};

/** The board with the ghost, the controls and the tray, for `color`. */
export const cornersTray = (props: TrayProps) => {
  const { state, color, local, draw } = props;
  const { size } = state.variant;
  const turn = state.turn === color;
  const remaining = state.remaining[color];
  const piece = pickedPiece(state, color, local);
  // The ghost only goes on the board on our turn.
  const anchor = turn ? (local.tapped ?? local.hover) : null;
  const placement = piece && anchor ? ghostPlacement(piece, local.orientation, anchor, size) : null;
  const check = placement ? checkMove(state, color, { kind: "place", ...placement }) : null;
  const overlay: BoardOverlay | undefined =
    placement && check
      ? { squares: placementSquares(placement) ?? [], color, invalid: !check.ok }
      : undefined;

  const status = (() => {
    if (remaining.length === 0) return "You've placed all your pieces.";
    if (!turn) return piece ? "You can place it on your turn." : "Not your turn yet.";
    if (!piece) return "Pick a piece.";
    if (!check) return "Tap or click the board to place it.";
    if (!check.ok) return reasonText[check.reason];
    return local.tapped ? "Tap again to play it." : "Click to play it here.";
  })();

  const squareFrom = (event: PointerEvent | MouseEvent) => {
    const target = event.currentTarget;
    const board = target instanceof Element ? target.querySelector("svg") : null;
    return board && squareAt(board.getBoundingClientRect(), size, event.clientX, event.clientY);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return; // Touch previews by tapping.
    const square = squareFrom(event);
    if (sameSquare(square, local.hover) && !local.tapped) return;
    Object.assign(local, { hover: square, tapped: null });
    if (turn && piece) draw();
  };
  const onPointerLeave = () => {
    if (!local.hover) return;
    local.hover = null;
    if (turn && piece && !local.tapped) draw();
  };
  // Click events don't say what made them in every browser, so remember it.
  const onPointerDown = (event: PointerEvent) => {
    local.touch = event.pointerType === "touch";
  };
  const onBoardClick = (event: MouseEvent) => {
    const square = squareFrom(event);
    if (!square) return;
    const move = pressBoard(state, color, local, square);
    if (move) props.onConfirm(move);
    draw();
  };
  const run = (action: TrayAction) => () => {
    if (act(local, action)) draw();
  };

  return html`<div class="corners-play">
    <div
      class="corners-play-board ${turn && piece ? "placing" : ""}"
      @pointermove=${onPointerMove}
      @pointerleave=${onPointerLeave}
      @pointerdown=${onPointerDown}
      @click=${onBoardClick}
    >
      ${cornersBoard(state, { overlay })}
    </div>
    <p class="corners-status" aria-live="polite">${status}</p>
    <div class="corners-controls">
      <button
        ?disabled=${!piece}
        @click=${run("rotate-ccw")}
        aria-label="Rotate left"
        aria-keyshortcuts="E"
        title="Rotate left"
      >
        ⟲ <span class="label">Rotate</span> ${keyCap("E")}
      </button>
      <button
        ?disabled=${!piece}
        @click=${run("rotate-cw")}
        aria-label="Rotate right"
        aria-keyshortcuts="R"
        title="Rotate right"
      >
        ⟳ <span class="label">Rotate</span> ${keyCap("R")}
      </button>
      <button ?disabled=${!piece} @click=${run("flip")} aria-label="Flip" aria-keyshortcuts="F">
        ⇋ Flip ${keyCap("F")}
      </button>
    </div>
    ${pieceGrid(
      "Your pieces",
      handPieces(state, [color]),
      ({ id, played }) => html`<button
        class="tray-piece ${played ? "played" : ""}"
        aria-label=${id}
        aria-pressed=${id === piece ? "true" : "false"}
        title=${played ? `${id}, played` : id}
        ?disabled=${played}
        @click=${() => {
          select(local, id);
          draw();
        }}
      >
        ${pieceIcon(id, color)}
      </button>`,
    )}
  </div>`;
};

/** A control's hotkey as a key cap. CSS hides it on touch-only devices. */
const keyCap = (key: string) => html`<kbd class="key-cap" aria-hidden="true">${key}</kbd>`;

/** A piece's base shape, centered in a 5×5 box so pieces keep their relative size. */
export const pieceIcon = (id: PieceId, color: Color) => {
  const shape = PIECES[id];
  const dx = (5 - (Math.max(...shape.map(([x]) => x)) + 1)) / 2;
  const dy = (5 - (Math.max(...shape.map(([, y]) => y)) + 1)) / 2;
  return html`<svg viewBox="0 0 5 5" aria-hidden="true" fill="var(--color-${color})">
    ${shape.map(([x, y]) => svg`<rect x=${x + dx} y=${y + dy} width="1" height="1" />`)}
  </svg>`;
};

export type GridPiece = { id: PieceId; color: Color; played: boolean };

/**
 * Every piece of `colors`, color by color, with the ones already played
 * marked, so a tray keeps its layout all game.
 */
export const handPieces = (state: CornersState, colors: readonly Color[]): GridPiece[] =>
  colors.flatMap((color) =>
    state.variant.colors.includes(color)
      ? PIECE_IDS.map((id) => ({ id, color, played: !state.remaining[color].includes(id) }))
      : [],
  );

/** Pieces in rows by square count, smallest first, keeping their order within a row. */
export const bySize = <T extends GridPiece>(pieces: readonly T[]) => {
  const sizes = [...new Set(pieces.map(({ id }) => PIECES[id].length))].sort((a, b) => a - b);
  return sizes.map((size) => ({
    size,
    pieces: pieces.filter(({ id }) => PIECES[id].length === size),
  }));
};

/**
 * Pieces in rows by size, each row labeled with its square count. `cell` draws
 * one piece. Your tray and another player's hand both use it.
 */
export const pieceGrid = <T extends GridPiece>(
  label: string,
  pieces: readonly T[],
  cell: (piece: T) => TemplateResult,
) =>
  html`<div class="corners-tray" role="group" aria-label=${label}>
    ${bySize(pieces).map(
      ({ size, pieces }) => html`<div
        class="tray-row"
        role="group"
        aria-label=${size === 1 ? "1 square" : `${size} squares`}
        data-size=${size}
      >
        <span class="tray-size" aria-hidden="true">${size}</span>
        <div class="tray-pieces">${pieces.map(cell)}</div>
      </div>`,
    )}
  </div>`;
