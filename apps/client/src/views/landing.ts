import { html } from "lit-html";
import { setToken } from "../token";

interface LandingState {
  creatingName: string;
  joiningCode: string;
  error: string;
  loading: boolean;
}

interface LandingCallbacks {
  draw: () => void;
  navigate: (path: string) => void;
}

export function createLandingState(): LandingState {
  return { creatingName: "", joiningCode: "", error: "", loading: false };
}

export const landing = (state: LandingState, { draw, navigate }: LandingCallbacks) => {
  const onCreateInput = (e: Event) => {
    state.creatingName = (e.target as HTMLInputElement).value;
    state.error = "";
    draw();
  };

  const onJoinInput = (e: Event) => {
    state.joiningCode = (e.target as HTMLInputElement).value.toUpperCase();
    state.error = "";
    draw();
  };

  const onCreate = async (e: Event) => {
    e.preventDefault();
    const name = state.creatingName.trim();
    if (!name) {
      state.error = "Enter your name to create a room.";
      draw();
      return;
    }

    state.loading = true;
    state.error = "";
    draw();

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        state.error = (body as { message?: string } | null)?.message ?? "Failed to create room.";
        state.loading = false;
        draw();
        return;
      }

      const { code, token } = (await res.json()) as { code: string; token: string };
      setToken(code, token);
      state.loading = false;
      navigate(`/r/${code}`);
    } catch {
      state.error = "Could not reach the server.";
      state.loading = false;
      draw();
    }
  };

  const onJoin = (e: Event) => {
    e.preventDefault();
    const code = state.joiningCode.trim();
    if (!code) {
      state.error = "Enter a room code to join.";
      draw();
      return;
    }
    navigate(`/r/${code}`);
  };

  return html`
    <h1>Backroom Games</h1>
    <p>Board games for the backroom. Create a room, share the code, play with friends.</p>

    ${state.error ? html`<p class="error" role="alert">${state.error}</p>` : ""}

    <section class="landing-section">
      <h2>Create a room</h2>
      <form @submit=${onCreate}>
        <label>
          Your name
          <input
            type="text"
            .value=${state.creatingName}
            @input=${onCreateInput}
            placeholder="Enter your name"
            maxlength="30"
            ?disabled=${state.loading}
            data-testid="create-name"
          />
        </label>
        <button type="submit" ?disabled=${state.loading || !state.creatingName.trim()} data-testid="create-btn">
          ${state.loading ? "Creating…" : "Create room"}
        </button>
      </form>
    </section>

    <section class="landing-section">
      <h2>Join a room</h2>
      <form @submit=${onJoin}>
        <label>
          Room code
          <input
            type="text"
            .value=${state.joiningCode}
            @input=${onJoinInput}
            placeholder="e.g. K7QXM"
            maxlength="5"
            ?disabled=${state.loading}
            data-testid="join-code"
          />
        </label>
        <button type="submit" ?disabled=${state.loading || !state.joiningCode.trim()} data-testid="join-btn">
          Join room
        </button>
      </form>
    </section>
  `;
};
