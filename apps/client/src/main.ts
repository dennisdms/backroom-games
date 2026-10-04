import { CreateRoomRequest, MAX_NAME_LENGTH } from "@backroom/shared";
import { html, render } from "lit-html";
import { createRoom, getRoom } from "./api";
import { normalizeCode, parseRoute, type Route, roomPath, withPlayer } from "./routes";
import { type ConnectionStatus, connect } from "./socket";
import { browserStore, playerFromSearch, playerStorage } from "./storage";
import "./styles/main.css";
import { type FormAction, type Forms, landing } from "./views/landing";
import { namePrompt } from "./views/name-prompt";
import { room } from "./views/room";

// The whole client model (see CLAUDE.md): state lives in plain variables, any
// change calls draw(), and views are functions that return templates.

/** `?player=N` while testing several players in one browser, kept on every navigation. */
const player = playerFromSearch(location.search);
const storage = playerStorage(browserStore(), player);

let route: Route = parseRoute(location.pathname);
let connection: ConnectionStatus = "connecting";

const local: Forms = {
  name: storage.lastName() ?? "",
  code: "",
  pending: null,
  error: null,
};

const root = document.getElementById("app");
if (!root) throw new Error("missing #app element");

function draw() {
  render(view(), root as HTMLElement);
}

function view() {
  return html`${page()}
    <footer>
      Server: <span data-testid="connection" class="status ${connection}">${statusText[connection]}</span>
    </footer>`;
}

function page() {
  if (route.name === "landing") {
    return landing(local, {
      onName: (name) => {
        local.name = name;
      },
      onCode: (code) => {
        local.code = code;
      },
      onCreate: create,
      onJoin: join,
    });
  }
  // A seat comes from creating the room (token) or from the name prompt
  // (name, until #14 trades it for a token over the WebSocket).
  const code = route.code;
  if (storage.token(code) === null && storage.name(code) === null) {
    return namePrompt(code, local, {
      onName: (name) => {
        local.name = name;
      },
      onSubmit: () => submitName(code),
    });
  }
  return room(code);
}

const statusText: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  open: "Connected",
  closed: "Reconnecting…",
};

function navigate(path: string) {
  history.pushState(null, "", withPlayer(path, player));
  route = parseRoute(location.pathname);
  local.pending = null;
  local.error = null;
  draw();
}

window.addEventListener("popstate", () => {
  route = parseRoute(location.pathname);
  draw();
});

// Follow in-app links without a page load, and keep `?player=N` on them.
root.addEventListener("click", (e) => {
  const link = e.target instanceof Element ? e.target.closest("a") : null;
  const href = link?.getAttribute("href");
  if (!href?.startsWith("/") || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  navigate(href);
});

const NAME_ERROR = `Enter your name (up to ${MAX_NAME_LENGTH} characters).`;

function fail(action: FormAction, message: string) {
  local.pending = null;
  local.error = { action, message };
  draw();
}

function start(action: FormAction) {
  local.pending = action;
  local.error = null;
  draw();
}

async function create() {
  const body = CreateRoomRequest.safeParse({ game: "corners", name: local.name });
  if (!body.success) return fail("create", NAME_ERROR);
  start("create");
  const result = await createRoom(body.data);
  if (!result.ok) return fail("create", result.error);
  const { code, playerToken } = result.value;
  storage.setToken(code, playerToken);
  storage.setName(code, body.data.name);
  navigate(roomPath(code));
}

async function join() {
  const code = normalizeCode(local.code);
  if (!code) return fail("join", "Enter a room code: letters and numbers, like K7QXM.");
  start("join");
  const result = await getRoom(code);
  if (!result.ok) return fail("join", result.error);
  local.code = "";
  navigate(roomPath(result.value.code));
}

async function submitName(code: string) {
  const name = CreateRoomRequest.shape.name.safeParse(local.name);
  if (!name.success) return fail("name", NAME_ERROR);
  // The room may be gone, or the link mistyped.
  start("name");
  const result = await getRoom(code);
  if (!result.ok) return fail("name", result.error);
  storage.setName(code, name.data);
  // TODO(#14): send `hello` with this name, and with storage.token(code) when
  // there is one, then store the token from `welcome` with storage.setToken.
  local.pending = null;
  draw();
}

connect({
  onStatus: (status) => {
    connection = status;
    draw();
  },
  onMessage: () => {
    // Nothing yet besides pong. Room state messages will update state here.
  },
});

draw();
