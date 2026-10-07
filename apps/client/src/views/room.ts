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
import { type LobbyActions, type LobbyLocal, lobby } from "./lobby";

/** UI-only state for each phase of the room. */
export interface RoomLocal {
  lobby: LobbyLocal;
  game: GameLocal;
}

export type RoomActions = LobbyActions & GameActions;

/** The room page: joining, then the lobby, then the game and its results. */
export const room = (code: string, session: Session | null, l: RoomLocal, a: RoomActions) => html`
  <h1>${session?.room ? gameName(session.room.gameId) : `Room ${code}`}</h1>
  ${session?.error ? html`<p role="alert">${session.error}</p>` : nothing}
  ${session?.room ? phase(session.room, turnTimeLeft(session), l, a) : html`<p class="muted">Joining…</p>`}
  <p><a href="/">Back</a></p>
`;

const phase = (room: RoomState, timeLeft: number | null, l: RoomLocal, a: RoomActions) => {
  if (room.phase === "lobby") return lobby(room, l.lobby, a);
  // The server sends a game in every phase but the lobby.
  if (!room.game) return html`<p class="muted">Loading the game…</p>`;
  return room.phase === "playing"
    ? cornersGame(room, room.game, l.game, a, timeLeft)
    : cornersResults(room, room.game, a);
};
