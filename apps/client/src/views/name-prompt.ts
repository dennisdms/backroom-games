import { html } from "lit-html";
import { type Forms, formError, nameField, submit } from "./landing";

export interface NamePromptActions {
  onName: (name: string) => void;
  onSubmit: () => void;
}

/** Asks for a name before joining a room this browser has no seat in yet. */
export const namePrompt = (code: string, f: Forms, a: NamePromptActions) => html`
  <form class="sheet name-prompt" @submit=${submit(a.onSubmit)}>
    <h1><span class="room-code-label">Room</span> ${code}</h1>
    <p>Enter your name to join.</p>
    ${nameField(f, a.onName)}
    <button type="submit" class="primary" ?disabled=${f.pending !== null}>
      ${f.pending === "name" ? "Joining…" : "Join"}
    </button>
    ${formError(f, "name")}
  </form>
`;
