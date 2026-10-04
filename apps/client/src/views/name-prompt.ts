import { html } from "lit-html";
import { type Forms, formError, nameField, submit } from "./landing";

export interface NamePromptActions {
  onName: (name: string) => void;
  onSubmit: () => void;
}

/** Asks for a name before joining a room this browser has no seat in yet. */
export const namePrompt = (code: string, f: Forms, a: NamePromptActions) => html`
  <h1>Room ${code}</h1>
  <form class="entry-card name-prompt" @submit=${submit(a.onSubmit)}>
    <p>Enter your name to join.</p>
    ${nameField(f, a.onName)}
    <button type="submit" ?disabled=${f.pending !== null}>
      ${f.pending === "name" ? "Joining…" : "Join"}
    </button>
    ${formError(f, "name")}
  </form>
  <p><a href="/">Back</a></p>
`;
