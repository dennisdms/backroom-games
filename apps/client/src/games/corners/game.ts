// Corners UI: the game screen (whose turn, scores, the board and tray, Pass)
// and the results screen (ranking and Rematch), drawn from the room's state.
import {
  type Color,
  type CornersState,
  legalMovesExist,
  type Placement,
  type RoomState,
  rankByScore,
  score,
} from "@backroom/shared";
import { html, nothing } from "lit-html";
import { cornersBoard } from "./board";
import { cornersTray, newTrayLocal, type TrayLocal, type TrayProps } from "./tray";

/** UI-only game state: the tray's picked piece, orientation and ghost. */
export interface GameLocal {
  tray: TrayLocal;
}

export const newGameLocal = (): GameLocal => ({ tray: newTrayLocal() });

export interface GameActions {
  /** Sends `placePiece`. */
  onPlace: (placement: Placement) => void;
  onPass: () => void;
  onRematch: () => void;
  /** Redraws after a UI-only change, e.g. picking a piece. */
  draw: () => void;
}

/** The seat that plays `color`, or -1 if none does. */
export const seatOf = (state: CornersState, color: Color): number =>
  state.variant.seats.findIndex((colors) => colors.includes(color));

/** The player's name in `seat`, or "Seat N" if the room doesn't list one. */
export const nameOf = (room: RoomState, seat: number): string =>
  room.players.find((p) => p.seat === seat)?.name ?? `Seat ${seat + 1}`;

/**
 * The color whose pieces `seat`'s tray shows: the one to move if it's theirs,
 * otherwise their next one in turn order. Null for a seat without colors.
 */
export const trayColor = (state: CornersState, seat: number): Color | null => {
  const mine = state.variant.seats[seat] ?? [];
  const { colors } = state.variant;
  const start = colors.indexOf(state.turn);
  for (let step = 0; step < colors.length; step++) {
    const color = colors[(start + step) % colors.length];
    if (color !== undefined && mine.includes(color)) return color;
  }
  return null;
};

/** "Your turn (blue)" or "Grace's turn (yellow)". */
export const turnText = (room: RoomState, state: CornersState): string => {
  const seat = seatOf(state, state.turn);
  const who = seat === room.you ? "Your" : `${nameOf(room, seat)}'s`;
  return `${who} turn (${state.turn})`;
};

export type Standing = {
  seat: number;
  name: string;
  colors: Color[];
  score: number;
  /** 1 is best; tied seats share a rank. */
  rank: number;
};

/** Every seat's score, best first, with ties sharing a rank. */
export const standings = (room: RoomState, state: CornersState): Standing[] =>
  rankByScore(score(state).bySeat).map(({ player, score, rank }) => ({
    seat: player,
    name: nameOf(room, player),
    colors: state.variant.seats[player] ?? [],
    score,
    rank,
  }));

/** "Ada", "Ada and Grace", "Ada, Grace and Linus". */
const joinNames = (names: readonly string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** The headline under "Game over": who won, or who tied. */
export const resultText = (room: RoomState, list: readonly Standing[]): string => {
  const winners = list.filter((s) => s.rank === 1);
  const [first] = winners;
  if (!first) return "";
  if (winners.length === 1) return first.seat === room.you ? "You win!" : `${first.name} wins!`;
  const names = winners.map((s) => (s.seat === room.you ? "you" : s.name));
  return `It's a tie between ${joinNames(names)}.`;
};

/** 1st, 2nd, 3rd, 4th. Enough for four seats. */
export const ordinal = (n: number): string => `${n}${["th", "st", "nd", "rd"][n] ?? "th"}`;

/** The tray for this player's seat, or null if they have no colors. */
export const gameTrayProps = (
  room: RoomState,
  state: CornersState,
  l: GameLocal,
  a: GameActions,
): TrayProps | null => {
  const color = trayColor(state, room.you);
  return color && { state, color, local: l.tray, draw: a.draw, onConfirm: a.onPlace };
};

/** The game while it's being played. */
export const cornersGame = (room: RoomState, state: CornersState, l: GameLocal, a: GameActions) => {
  const tray = gameTrayProps(room, state, l, a);
  const yours = tray !== null && tray.color === state.turn;
  return html`<section class="game" data-testid="game">
    <p class="turn ${yours ? "yours" : ""}" data-testid="turn" aria-live="polite">
      <span class="swatch" style="background: var(--color-${state.turn})"></span>
      ${turnText(room, state)}
    </p>
    ${scores(room, state)}
    ${tray ? cornersTray(tray) : cornersBoard(state)}
    ${yours ? pass(state, state.turn, a) : nothing}
  </section>`;
};

/**
 * Pass, for the color to move. The rules only allow it when none of the
 * color's pieces fit, and the server already skips blocked colors, so it's
 * almost always disabled.
 */
const pass = (state: CornersState, color: Color, a: GameActions) => {
  const canPlace = legalMovesExist(state, color);
  return html`<p class="pass">
    <button type="button" ?disabled=${canPlace} @click=${a.onPass}>Pass</button>
    ${canPlace ? html`<span class="muted">You can only pass when none of your pieces fit.</span>` : nothing}
  </p>`;
};

/** The live scores, one row per seat, with the seat to move marked. */
const scores = (room: RoomState, state: CornersState) => {
  const { byColor, bySeat } = score(state);
  const moving = seatOf(state, state.turn);
  return html`<ul class="scores" data-testid="scores" aria-label="Scores">
    ${state.variant.seats.map(
      (colors, seat) => html`<li
        class="score ${seat === moving ? "current" : ""}"
        data-seat=${seat}
      >
        ${swatches(colors, (c) => `${c}: ${byColor[c]}`)}
        <span class="seat-name">${nameOf(room, seat)}</span>
        ${seat === room.you ? html`<span class="muted">(you)</span>` : nothing}
        <strong class="points">${bySeat[seat]}</strong>
      </li>`,
    )}
  </ul>`;
};

const swatches = (colors: readonly Color[], title: (color: Color) => string) =>
  html`<span class="seat-colors">
    ${colors.map(
      (c) =>
        html`<span class="swatch" style="background: var(--color-${c})" title=${title(c)}></span>`,
    )}
  </span>`;

/** The game once it's over: the ranking, Rematch for the host, and the final board. */
export const cornersResults = (room: RoomState, state: CornersState, a: GameActions) => {
  const list = standings(room, state);
  return html`<section class="results" data-testid="results">
    <h2>Game over</h2>
    <p class="winner" data-testid="winner">${resultText(room, list)}</p>
    <ul class="scores" data-testid="standings" aria-label="Final scores">
      ${list.map(
        (s) => html`<li class="score" data-seat=${s.seat} data-rank=${s.rank}>
          <span class="rank">${ordinal(s.rank)}</span>
          ${swatches(s.colors, (c) => c)}
          <span class="seat-name">${s.name}</span>
          ${s.seat === room.you ? html`<span class="muted">(you)</span>` : nothing}
          <strong class="points">${s.score}</strong>
        </li>`,
      )}
    </ul>
    ${
      room.you === room.host
        ? html`<p><button type="button" class="primary" @click=${a.onRematch}>Rematch</button></p>`
        : html`<p class="muted">Waiting for the host to start a rematch.</p>`
    }
    ${cornersBoard(state)}
  </section>`;
};
