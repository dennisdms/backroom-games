// Corners UI: playing a piece. The tray of remaining pieces, the rotate, flip,
// undo and confirm controls, and the ghost of the piece on the board. Placing
// the ghost is local; nothing leaves the client until the player confirms.
import {
  type Color,
  type CornersState,
  checkMove,
  cornerCandidates,
  flipOrientation,
  type IllegalReason,
  ORIENTATIONS,
  PIECES,
  type PieceId,
  type Placement,
  placementSquares,
  rotateOrientation,
  type Square,
} from "@backroom/shared";
import { html, nothing, svg } from "lit-html";
import { type BoardOverlay, cornersBoard, squareAt } from "./board";

/** The tray's UI-only state. Whoever shows the tray owns it and passes it in. */
export type TrayLocal = {
  piece: PieceId | null;
  /** An index into `ORIENTATIONS[piece]`. */
  orientation: number;
  /** The square under the mouse or pen, which the ghost follows. */
  hover: Square | null;
  /** Where a click or tap put the ghost. Confirm plays it, Undo clears it. */
  pinned: Square | null;
};

export const newTrayLocal = (): TrayLocal => ({
  piece: null,
  orientation: 0,
  hover: null,
  pinned: null,
});

export type TrayProps = {
  state: CornersState;
  /**
   * The color this player places. When it isn't its turn, pieces can still be
   * picked, turned and flipped, but not put on the board or confirmed.
   */
  color: Color;
  local: TrayLocal;
  /** Redraws after `local` changes. */
  draw: () => void;
  /** Called with the confirmed move, e.g. to send `placePiece`. */
  onConfirm: (placement: Placement) => void;
};

export type TrayAction = "rotate-cw" | "rotate-ccw" | "flip" | "undo" | "cancel";

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

/**
 * Applies `action` to `local`. Returns whether anything changed. "undo" lifts
 * the placed ghost; "cancel" does that, or else puts the piece back.
 */
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
    case "undo":
      if (!local.pinned) return false;
      local.pinned = null;
      return true;
    case "cancel":
      if (local.pinned) local.pinned = null;
      else if (piece) Object.assign(local, { piece: null, orientation: 0 });
      else return false;
      return true;
    default:
      return action satisfies never;
  }
};

/** Picks `pieceId`, or puts it back if it's already picked. */
const select = (local: TrayLocal, pieceId: PieceId) => {
  if (local.piece === pieceId) Object.assign(local, { piece: null, orientation: 0 });
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

const isTurn = ({ state, color }: TrayProps) => state.turn === color;

const sameSquare = (a: Square | null, b: Square | null) =>
  a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1]);

const reasonText: Record<IllegalReason, string> = {
  "not-your-turn": "It isn't your turn.",
  "piece-used": "You've already played that piece.",
  "unknown-orientation": "That piece can't be turned that way.",
  "off-board": "The piece has to fit on the board.",
  occupied: "Those squares are taken.",
  "misses-corner": "Your first piece has to cover your corner.",
  "no-corner-contact": "It has to touch one of your pieces corner to corner.",
  "touches-own-edge": "It can't share an edge with your own pieces.",
  "can-still-place": "You can't pass while you can still place a piece.",
};

/** The board with the ghost, the controls and the tray, for `color`. */
export const cornersTray = (props: TrayProps) => {
  const { state, color, local, draw } = props;
  const { size } = state.variant;
  const turn = isTurn(props);
  const remaining = state.remaining[color];
  // The picked piece, unless it was played since.
  const piece = local.piece && remaining.includes(local.piece) ? local.piece : null;
  // The ghost only goes on the board on our turn.
  const anchor = turn ? (local.pinned ?? local.hover) : null;
  const placement = piece && anchor ? ghostPlacement(piece, local.orientation, anchor, size) : null;
  const check = placement ? checkMove(state, color, { kind: "place", ...placement }) : null;
  const overlay: BoardOverlay | undefined =
    placement && check
      ? { squares: placementSquares(placement) ?? [], color, invalid: !check.ok }
      : undefined;
  const ready = local.pinned !== null && placement !== null && check?.ok === true;

  const status = (() => {
    if (remaining.length === 0) return "You've placed all your pieces.";
    if (!turn) return piece ? "You can place it on your turn." : "Not your turn yet.";
    if (!piece) return "Pick a piece.";
    if (!check) return "Tap or click the board to place it.";
    if (!check.ok) return reasonText[check.reason];
    return ready ? "Confirm to play it." : "Click to place it here.";
  })();

  const squareFrom = (event: PointerEvent | MouseEvent) => {
    const target = event.currentTarget;
    const board = target instanceof Element ? target.querySelector("svg") : null;
    return board && squareAt(board.getBoundingClientRect(), size, event.clientX, event.clientY);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return; // Touch places by tapping.
    const square = squareFrom(event);
    if (sameSquare(square, local.hover)) return;
    local.hover = square;
    if (turn && piece && !local.pinned) draw();
  };
  const onPointerLeave = () => {
    if (!local.hover) return;
    local.hover = null;
    if (turn && piece && !local.pinned) draw();
  };
  const onBoardClick = (event: MouseEvent) => {
    const square = squareFrom(event);
    if (!turn || !piece || !square) return;
    local.pinned = square;
    draw();
  };
  const run = (action: TrayAction) => () => {
    if (act(local, action)) draw();
  };
  const confirm = () => {
    if (!ready || !placement) return;
    Object.assign(local, { piece: null, orientation: 0, pinned: null });
    props.onConfirm(placement);
    draw();
  };

  return html`<div class="corners-play">
    <div
      class="corners-play-board ${turn && piece ? "placing" : ""}"
      @pointermove=${onPointerMove}
      @pointerleave=${onPointerLeave}
      @click=${onBoardClick}
    >
      ${cornersBoard(state, {
        overlay,
        candidates: turn ? { squares: cornerCandidates(state, color), color } : undefined,
      })}
    </div>
    <p class="corners-status" aria-live="polite">${status}</p>
    <div class="corners-controls">
      <button
        ?disabled=${!piece}
        @click=${run("rotate-ccw")}
        aria-label="Rotate left"
        title="Rotate left (E)"
      >
        ⟲ <span class="label">Rotate</span>
      </button>
      <button
        ?disabled=${!piece}
        @click=${run("rotate-cw")}
        aria-label="Rotate right"
        title="Rotate right (R)"
      >
        ⟳ <span class="label">Rotate</span>
      </button>
      <button ?disabled=${!piece} @click=${run("flip")} title="Flip (F)">⇋ Flip</button>
      <button ?disabled=${!turn || !local.pinned || !piece} @click=${run("undo")}>Undo</button>
      <button class="primary" ?disabled=${!ready} @click=${confirm}>Confirm</button>
    </div>
    <div class="corners-tray" role="group" aria-label="Your pieces">
      ${remaining.map(
        (id) => html`<button
          class="tray-piece"
          aria-label=${id}
          aria-pressed=${id === piece ? "true" : "false"}
          @click=${() => {
            select(local, id);
            draw();
          }}
        >
          ${pieceIcon(id, color)}
        </button>`,
      )}
      ${remaining.length === 0 ? html`<p class="muted">No pieces left.</p>` : nothing}
    </div>
  </div>`;
};

/** A piece's base shape, centered in a 5×5 box so pieces keep their relative size. */
const pieceIcon = (id: PieceId, color: Color) => {
  const shape = PIECES[id];
  const dx = (5 - (Math.max(...shape.map(([x]) => x)) + 1)) / 2;
  const dy = (5 - (Math.max(...shape.map(([, y]) => y)) + 1)) / 2;
  return html`<svg viewBox="0 0 5 5" aria-hidden="true" fill="var(--color-${color})">
    ${shape.map(([x, y]) => svg`<rect x=${x + dx} y=${y + dy} width="1" height="1" />`)}
  </svg>`;
};
