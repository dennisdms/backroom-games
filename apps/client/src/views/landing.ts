import { MAX_NAME_LENGTH } from "@backroom/shared";
import { html, nothing } from "lit-html";

/** A form request in flight, or the one an error belongs to. */
export type FormAction = "create" | "join" | "name";

/** UI-only form state, shared by the landing page and the name prompt. */
export interface Forms {
  name: string;
  code: string;
  pending: FormAction | null;
  error: { action: FormAction; message: string } | null;
}

export interface LandingActions {
  onName: (name: string) => void;
  onCode: (code: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

export const landing = (f: Forms, a: LandingActions) => html`
  <h1>Backroom Games</h1>
  <p>Board games for the backroom. Create a room, share the code, play with friends.</p>

  <div class="entry">
    <form class="entry-card" @submit=${submit(a.onCreate)}>
      <h2>New room</h2>
      <p class="muted">Start a game of Corners and invite friends with the code.</p>
      ${nameField(f, a.onName)}
      <button type="submit" ?disabled=${f.pending !== null}>
        ${f.pending === "create" ? "Creating…" : "Create room"}
      </button>
      ${formError(f, "create")}
    </form>

    <form class="entry-card" @submit=${submit(a.onJoin)}>
      <h2>Join a room</h2>
      <p class="muted">Got a code from a friend? Enter it here.</p>
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
        ${f.pending === "join" ? "Checking…" : "Join room"}
      </button>
      ${formError(f, "join")}
    </form>
  </div>
`;

/** The name input, also used by the name prompt on the room page. */
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
