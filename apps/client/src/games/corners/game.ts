// Corners UI: the game screen (whose turn, the players and their scores, the
// board and your tray or another player's pieces, Pass) and the results screen
// (ranking and Rematch), drawn from the room's state.
import {
  type Color,
  type CornersState,
  legalMovesExist,
  type PieceId,
  type Placement,
  type RoomState,
  rankByScore,
  score,
} from "@backroom/shared";
import { html, nothing } from "lit-html";
import { cornersBoard } from "./board";
import {
  cornersTray,
  newTrayLocal,
  pieceGrid,
  pieceIcon,
  type TrayLocal,
  type TrayProps,
} from "./tray";

/** UI-only game state: the tray's picked piece, orientation and ghost. */
export interface GameLocal {
  tray: TrayLocal;
  /** The seat whose remaining pieces show in place of your tray, or null for your own. */
  viewing: number | null;
}

export const newGameLocal = (): GameLocal => ({ tray: newTrayLocal(), viewing: null });

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

/** Whether the color to move is this player's. */
export const isYourTurn = (room: RoomState, state: CornersState): boolean =>
  seatOf(state, state.turn) === room.you;

const yourTurnInPlay = (room: RoomState | null | undefined): boolean =>
  room?.phase === "playing" && room.game ? isYourTurn(room, room.game) : false;

/** Whether it's become your turn between two room states, e.g. to bring your tray back. */
export const turnCameToYou = (
  before: RoomState | null | undefined,
  after: RoomState | null | undefined,
): boolean => !yourTurnInPlay(before) && yourTurnInPlay(after);

/** Shows `seat`'s pieces in place of the tray, or your own tray for your seat. */
export const viewSeat = (room: RoomState, l: GameLocal, seat: number) => {
  l.viewing = seat === room.you ? null : seat;
};

/** Another seat's remaining pieces, read-only. */
export type Hand = {
  seat: number;
  name: string;
  pieces: { color: Color; id: PieceId }[];
};

/** The hand shown in place of your tray, or null when you're looking at your own. */
export const viewedHand = (room: RoomState, state: CornersState, l: GameLocal): Hand | null => {
  const seat = l.viewing;
  if (seat === null || seat === room.you) return null;
  const colors = state.variant.seats[seat];
  if (!colors) return null;
  return {
    seat,
    name: nameOf(room, seat),
    pieces: colors.flatMap((color) => state.remaining[color].map((id) => ({ color, id }))),
  };
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

/**
 * The tray for this player's seat, or null if they have no colors or are
 * looking at another player's pieces.
 */
export const gameTrayProps = (
  room: RoomState,
  state: CornersState,
  l: GameLocal,
  a: GameActions,
): TrayProps | null => {
  if (viewedHand(room, state, l)) return null;
  const color = trayColor(state, room.you);
  return color && { state, color, local: l.tray, draw: a.draw, onConfirm: a.onPlace };
};

/** The game while it's being played. */
export const cornersGame = (room: RoomState, state: CornersState, l: GameLocal, a: GameActions) => {
  const hand = viewedHand(room, state, l);
  const tray = gameTrayProps(room, state, l, a);
  const yours = isYourTurn(room, state);
  return html`<section class="game" data-testid="game">
    ${players(room, state, l, a)}
    <p class="turn ${yours ? "yours" : ""}" data-testid="turn" aria-live="polite">
      <span class="swatch" style="background: var(--color-${state.turn})"></span>
      ${turnText(room, state)}
    </p>
    ${tray ? cornersTray(tray) : cornersBoard(state)}
    ${hand ? handView(room, hand, l, a) : nothing}
    ${yours && tray ? pass(state, state.turn, a) : nothing}
  </section>`;
};

/** Another player's remaining pieces, read-only, with a way back to yours. */
const handView = (room: RoomState, hand: Hand, l: GameLocal, a: GameActions) => {
  const back = () => {
    viewSeat(room, l, room.you);
    a.draw();
  };
  const count = hand.pieces.length;
  return html`<div class="hand" data-testid="hand" data-seat=${hand.seat}>
    <p class="hand-head">
      <span>${hand.name}'s pieces (${count})</span>
      <button type="button" @click=${back}>Back to your pieces</button>
    </p>
    ${pieceGrid(
      `${hand.name}'s pieces`,
      hand.pieces,
      ({ color, id }) => html`<span
        class="tray-piece"
        role="img"
        aria-label=${id}
        data-piece=${id}
        title=${id}
      >
        ${pieceIcon(id, color)}
      </span>`,
    )}
    ${count === 0 ? html`<p class="muted">No pieces left.</p>` : nothing}
  </div>`;
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

/**
 * The players and their live scores, one per seat, with the seat to move
 * marked. Clicking one shows their remaining pieces; yours shows your tray.
 */
const players = (room: RoomState, state: CornersState, l: GameLocal, a: GameActions) => {
  const { byColor, bySeat } = score(state);
  const moving = seatOf(state, state.turn);
  const shown = viewedHand(room, state, l)?.seat ?? room.you;
  return html`<ul class="scores players" data-testid="scores" aria-label="Players">
    ${state.variant.seats.map((colors, seat) => {
      const name = nameOf(room, seat);
      const you = seat === room.you;
      return html`<li class="score ${seat === moving ? "current" : ""}" data-seat=${seat}>
        <button
          type="button"
          class="player"
          aria-pressed=${seat === shown ? "true" : "false"}
          title=${you ? "Show your pieces" : `Show ${name}'s pieces`}
          @click=${() => {
            viewSeat(room, l, seat);
            a.draw();
          }}
        >
          ${swatches(colors, (c) => `${c}: ${byColor[c]}`)}
          <span class="seat-name">${name}</span>
          ${you ? html`<span class="muted">(you)</span>` : nothing}
          ${seat === moving ? html`<span class="to-move">to move</span>` : nothing}
          <strong class="points">${bySeat[seat]}</strong>
        </button>
      </li>`;
    })}
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
