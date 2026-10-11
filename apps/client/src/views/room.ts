import type { RoomState } from "@backroom/shared";
import { html, nothing } from "lit-html";
import {
  cornersGame,
  cornersResults,
  type GameActions,
  type GameLocal,
} from "../games/corners/game";
import { gameName } from "../games/names";
import { type Session, turnTimeLeft } from "../session";
import { copyText, type LobbyActions, type LobbyLocal, lobby } from "./lobby";

/** UI-only state for each phase of the room. */
export interface RoomLocal {
  lobby: LobbyLocal;
  game: GameLocal;
}

export type RoomActions = LobbyActions & GameActions;

/**
 * The room page: its code, game and invite link on top, then the lobby, the
 * game and its results.
 */
export const room = (code: string, session: Session | null, l: RoomLocal, a: RoomActions) => {
  const state = session?.room;
  return html`
    <header class="room-head">
      <p class="room-code">
        <span class="room-code-label">Room</span>
        <strong data-testid="room-code">${state?.code ?? code}</strong>
      </p>
      ${
        state
          ? html`<h1>${gameName(state.gameId)}</h1>
              <p class="invite">
                <span class="copy-status" role="status">${copyText[l.lobby.copy]}</span>
                <button type="button" @click=${a.onCopy}>Copy link</button>
              </p>`
          : html`<h1 class="visually-hidden">Room ${code}</h1>`
      }
    </header>
    ${session?.error ? html`<p class="form-error" role="alert">${session.error}</p>` : nothing}
    ${state ? phase(state, turnTimeLeft(session), l, a) : html`<p class="muted">Joining…</p>`}
  `;
};

const phase = (room: RoomState, timeLeft: number | null, l: RoomLocal, a: RoomActions) => {
  if (room.phase === "lobby") return lobby(room, a);
  // The server sends a game in every phase but the lobby.
  if (!room.game) return html`<p class="muted">Loading the game…</p>`;
  return room.phase === "playing"
    ? cornersGame(room, room.game, l.game, a, timeLeft)
    : cornersResults(room, room.game, a);
};
