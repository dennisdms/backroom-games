import {
  type GameInfo,
  MAX_NAME_LENGTH,
  playerRange,
  playerRangeLabel,
  ROOM_SETTINGS,
  type Setting,
  type SettingValue,
} from "@backroom/shared";
import { html, nothing } from "lit-html";
import { createPath } from "../routes";

/** A form request in flight, or the one an error belongs to. */
export type FormAction = "create" | "join" | "name";

/** UI-only form state, shared by the landing page, create form and name prompt. */
export interface Forms {
  name: string;
  code: string;
  /** The create form's picks, by `Setting.key`. Unpicked settings keep their default. */
  settings: Record<string, SettingValue>;
  pending: FormAction | null;
  error: { action: FormAction; message: string } | null;
}

export interface LandingActions {
  onName: (name: string) => void;
  onCode: (code: string) => void;
  onJoin: () => void;
}

/** The landing page: join a room by code, or pick a game to create one. */
export const landing = (games: readonly GameInfo[], f: Forms, a: LandingActions) => html`
  <h1>Backroom Games</h1>
  <p>Board games for the backroom. Create a room, share the code, play with friends.</p>

  <form class="entry-card join-card" @submit=${submit(a.onJoin)}>
    <h2>Join a room</h2>
    <div class="join-fields">
      ${nameField(f, a.onName)}
      <label>
        Room code
        <input
          class="code-input"
          name="code"
          required
          maxlength="12"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="K7QXM"
          .value=${f.code}
          @input=${(e: Event) => a.onCode(inputValue(e))}
        />
      </label>
      <button type="submit" ?disabled=${f.pending !== null}>
        ${f.pending === "join" ? "Joining…" : "Join"}
      </button>
    </div>
    ${formError(f, "join")}
  </form>

  <section class="create" aria-labelledby="create-heading">
    <h2 id="create-heading">Create a room</h2>
    <ul class="game-list">
      ${games.map(
        (game) => html`
          <li>
            <a class="game-card" href=${createPath(game.id)}>
              <span class="game-name">${game.name}</span>
              ${players(game)}
            </a>
          </li>
        `,
      )}
    </ul>
  </section>
`;

export interface CreateFormActions {
  onName: (name: string) => void;
  onSetting: (key: string, value: SettingValue) => void;
  onCreate: () => void;
}

/**
 * The form that creates a room for `game`: the name, then the settings every
 * room has and the game's own options.
 */
export const createForm = (game: GameInfo, f: Forms, a: CreateFormActions) => html`
  <p><a href="/" class="back"><span aria-hidden="true">←</span> All games</a></p>
  <form class="entry-card create-form" @submit=${submit(a.onCreate)}>
    <h1>New ${game.name} room</h1>
    ${players(game)}
    ${nameField(f, a.onName)}
    ${[...ROOM_SETTINGS, ...game.options].map((s) => settingField(s, f, a))}
    <button type="submit" ?disabled=${f.pending !== null}>
      ${f.pending === "create" ? "Creating…" : "Create room"}
    </button>
    ${formError(f, "create")}
  </form>
`;

/** The value picked for `setting`, or its default. */
export const pickedValue = (f: Forms, setting: Setting): SettingValue =>
  f.settings[setting.key] ?? setting.default;

/** One setting as a drop-down of its choices. */
const settingField = (setting: Setting, f: Forms, a: CreateFormActions) => {
  const picked = pickedValue(f, setting);
  return html`<label>
    ${setting.label}
    <select
      name=${setting.key}
      @change=${(e: Event) => {
        const index = Number((e.currentTarget as HTMLSelectElement).value);
        const choice = setting.choices[index];
        if (choice) a.onSetting(setting.key, choice.value);
      }}
    >
      ${setting.choices.map(
        (c, i) =>
          html`<option value=${i} ?selected=${c.value === picked}>${capitalize(c.label)}</option>`,
      )}
    </select>
  </label>`;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A small person icon and the player range, e.g. "2–4", read as "2 to 4 players". */
const players = (game: GameInfo) => html`
  <span class="players">
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="4.5" r="3" />
      <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6z" />
    </svg>
    <span class="visually-hidden">${playerRangeLabel(game.playerCounts)}</span>
    <span aria-hidden="true">${playerRange(game.playerCounts)}</span>
  </span>
`;

/** The name input, also used by the create form and the name prompt. */
export const nameField = (f: Forms, onName: (name: string) => void) => html`
  <label>
    Your name
    <input
      name="name"
      required
      maxlength=${MAX_NAME_LENGTH}
      autocomplete="nickname"
      .value=${f.name}
      @input=${(e: Event) => onName(inputValue(e))}
    />
  </label>
`;

/** The error for `action`'s form, if that's the one that failed. */
export const formError = (f: Forms, action: FormAction) =>
  f.error?.action === action
    ? html`<p class="form-error" role="alert">${f.error.message}</p>`
    : nothing;

export const submit = (action: () => void) => (e: Event) => {
  e.preventDefault();
  action();
};

const inputValue = (e: Event) => (e.currentTarget as HTMLInputElement).value;
