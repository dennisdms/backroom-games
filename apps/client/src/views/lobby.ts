import {
  choiceLabel,
  gameInfo,
  type Player,
  ROOM_SETTINGS,
  type RoomState,
  type SettingValue,
} from "@backroom/shared";
import { html, nothing } from "lit-html";

/** UI-only lobby state: feedback for the copy button. */
export interface LobbyLocal {
  copy: "idle" | "copied" | "failed";
}

export const newLobbyLocal = (): LobbyLocal => ({ copy: "idle" });

export interface LobbyActions {
  onCopy: () => void;
  onStart: () => void;
}

/** "2", "2 or 4", "2, 3 or 4". */
export function formatCounts(counts: readonly number[]): string {
  if (counts.length <= 1) return counts.join("");
  return `${counts.slice(0, -1).join(", ")} or ${counts.at(-1)}`;
}

/** Why the game can't start with the players in the room, or null if it can. */
export function startBlocker(room: RoomState): string | null {
  const count = room.players.length;
  if (room.playerCounts.includes(count)) return null;
  const noun = count === 1 ? "player" : "players";
  return `The game needs ${formatCounts(room.playerCounts)} players to start; there ${count === 1 ? "is" : "are"} ${count} ${noun}.`;
}

/** The room's settings in a line: "Turn timer: 1 minute · Hints: off". */
export function settingsSummary(room: RoomState): string {
  const values: Record<string, SettingValue> = { ...room.settings, ...room.options };
  const settings = [...ROOM_SETTINGS, ...(gameInfo(room.gameId)?.options ?? [])];
  return settings.map((s) => `${s.label}: ${choiceLabel(s, values[s.key])}`).join(" · ");
}

/** The room before the game: its code, who's in it, its settings and the host's Start button. */
export const lobby = (room: RoomState, l: LobbyLocal, a: LobbyActions) => html`
  <section class="lobby">
    <p class="room-code">
      Code <strong data-testid="room-code">${room.code}</strong>
      <button type="button" @click=${a.onCopy}>Copy link</button>
      <span class="muted" role="status">${copyText[l.copy]}</span>
    </p>
    <ul class="seats" data-testid="seats">
      ${room.players.map((p) => seat(room, p))}
    </ul>
    <p class="muted" data-testid="settings">${settingsSummary(room)}</p>
    ${room.you === room.host ? startButton(room, a) : html`<p class="muted">Waiting for the host to start.</p>`}
  </section>
`;

const copyText: Record<LobbyLocal["copy"], string> = {
  idle: "",
  copied: "Copied",
  failed: "Couldn't copy; share the code instead.",
};

const seat = (room: RoomState, p: Player) => html`
  <li class="seat ${p.online ? "online" : "offline"}" data-seat=${p.seat}>
    <span class="presence" title=${p.online ? "Online" : "Offline"}></span>
    <span class="seat-name">${p.name}</span>
    ${p.seat === room.you ? html`<span class="muted">(you)</span>` : nothing}
    ${p.seat === room.host ? html`<span class="tag">host</span>` : nothing}
    ${p.online ? nothing : html`<span class="muted">offline</span>`}
    <span class="seat-colors">
      ${p.colors.map(
        (c) => html`<span class="swatch" style="background: var(--color-${c})" title=${c}></span>`,
      )}
    </span>
  </li>
`;

const startButton = (room: RoomState, a: LobbyActions) => {
  const blocker = startBlocker(room);
  return html`
    <p>
      <button type="button" class="start" ?disabled=${blocker !== null} @click=${a.onStart}>
        Start
      </button>
    </p>
    ${blocker ? html`<p class="muted" data-testid="start-blocker">${blocker}</p>` : nothing}
  `;
};
