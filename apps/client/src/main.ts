import { CreateRoomRequest, GAMES, MAX_NAME_LENGTH } from "@backroom/shared";
import { html, render } from "lit-html";
import { createRoom, getRoom } from "./api";
import { type GameActions, gameTrayProps, newGameLocal, turnCameToYou } from "./games/corners/game";
import { listenForTrayKeys } from "./games/corners/tray";
import { normalizeCode, parseRoute, type Route, roomPath, withPlayer } from "./routes";
import { newSession, receive, type Session } from "./session";
import { type ConnectionStatus, connect } from "./socket";
import { browserStore, playerFromSearch, playerStorage } from "./storage";
import "./styles/main.css";
import { createForm, type FormAction, type Forms, landing } from "./views/landing";
import { type LobbyLocal, newLobbyLocal } from "./views/lobby";
import { namePrompt } from "./views/name-prompt";
import { room } from "./views/room";

// The whole client model (see CLAUDE.md): state lives in plain variables, any
// change calls draw(), and views are functions that return templates.

/** `?player=N` while testing several players in one browser, kept on every navigation. */
const player = playerFromSearch(location.search);
const storage = playerStorage(browserStore(), player);

let route: Route = parseRoute(location.pathname);
let connection: ConnectionStatus = "connecting";
/** The room page's seat and state, from the server. Null on other pages. */
let session: Session | null = null;
/** The room `hello` went to on the current connection. */
let helloSent: string | null = null;

const local: Forms = {
  name: storage.lastName() ?? "",
  code: "",
  pending: null,
  error: null,
};
const lobbyLocal: LobbyLocal = newLobbyLocal();
let gameLocal = newGameLocal();

const root = document.getElementById("app");
if (!root) throw new Error("missing #app element");

function draw() {
  render(view(), root as HTMLElement);
}

function view() {
  // The board is stale until the restarted server sends the room again.
  const restarting = session?.restarting
    ? html`<p class="notice" role="status">Updating, back in a moment…</p>`
    : null;
  return html`${restarting}${page()}
    <footer>
      Server: <span data-testid="connection" class="status ${connection}">${statusText[connection]}</span>
    </footer>`;
}

function page() {
  if (route.name === "landing") {
    return landing(GAMES, local, {
      onName: (name) => {
        local.name = name;
      },
      onCode: (code) => {
        local.code = code;
      },
      onJoin: join,
    });
  }
  if (route.name === "create") {
    const { game } = route;
    return createForm(game, local, {
      onName: (name) => {
        local.name = name;
      },
      onCreate: () => create(game.id),
    });
  }
  // A seat comes from creating the room (token) or from the name prompt
  // (name, which `hello` trades for a token).
  const code = route.code;
  if (storage.token(code) === null && storage.name(code) === null) {
    return namePrompt(code, local, {
      onName: (name) => {
        local.name = name;
      },
      onSubmit: () => submitName(code),
    });
  }
  return room(
    code,
    session,
    { lobby: lobbyLocal, game: gameLocal },
    {
      onCopy: () => copyLink(code),
      onStart: () => socket.send({ type: "startGame" }),
      ...gameActions,
    },
  );
}

const gameActions: GameActions = {
  onPlace: (placement) => socket.send({ type: "placePiece", ...placement }),
  onPass: () => socket.send({ type: "pass" }),
  onRematch: () => socket.send({ type: "rematch" }),
  draw,
};

// Rotate and flip keys for the tray on screen, if any.
listenForTrayKeys(() => {
  const r = session?.room;
  return r?.phase === "playing" && r.game ? gameTrayProps(r, r.game, gameLocal, gameActions) : null;
});

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
  sync();
  draw();
}

window.addEventListener("popstate", () => {
  route = parseRoute(location.pathname);
  sync();
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

async function create(game: string) {
  const body = CreateRoomRequest.safeParse({ game, name: local.name });
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
  const name = CreateRoomRequest.shape.name.safeParse(local.name);
  if (!name.success) return fail("join", NAME_ERROR);
  const code = normalizeCode(local.code);
  if (!code) return fail("join", "Enter a room code: letters and numbers, like K7QXM.");
  start("join");
  const result = await getRoom(code);
  if (!result.ok) return fail("join", result.error);
  // With a name stored for the room, it opens without asking for one again.
  storage.setName(result.value.code, name.data);
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
  local.pending = null;
  sync();
  draw();
}

let copyTimer: ReturnType<typeof setTimeout> | undefined;

/** Copies the room's link (without `?player=N`) and shows brief feedback. */
async function copyLink(code: string) {
  try {
    await navigator.clipboard.writeText(new URL(roomPath(code), location.origin).href);
    lobbyLocal.copy = "copied";
  } catch {
    // No clipboard outside secure contexts, e.g. over plain http on the LAN.
    lobbyLocal.copy = "failed";
  }
  draw();
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    lobbyLocal.copy = "idle";
    draw();
  }, 2000);
}

/**
 * Takes this player's seat in the room on screen: sends `hello` once per
 * connection with the stored token, or the name to get one.
 */
function sync() {
  if (route.name !== "room") {
    session = null;
    return;
  }
  const { code } = route;
  if (session?.code !== code) session = newSession(code);
  const token = storage.token(code);
  const name = storage.name(code);
  if ((token === null && name === null) || helloSent === code) return;
  const sent = socket.send({
    type: "hello",
    code,
    // Ignored for a known token, but required.
    name: name ?? storage.lastName() ?? "Player",
    ...(token !== null && { token }),
  });
  if (sent) helloSent = code;
}

const socket = connect({
  onStatus: (status) => {
    connection = status;
    draw();
  },
  onOpen: () => {
    helloSent = null;
    sync();
  },
  onMessage: (message) => {
    if (!session) return;
    if (message.type === "welcome" && message.room.code === session.code) {
      storage.setToken(session.code, message.token);
    }
    const before = session.room;
    session = receive(session, message);
    // A new game (start or rematch) starts with nothing picked and your own pieces.
    if (session.room?.phase !== before?.phase) gameLocal = newGameLocal();
    // On your turn, your tray comes back if you were looking at someone else's pieces.
    else if (turnCameToYou(before, session.room)) gameLocal.viewing = null;
    draw();
  },
});

sync();
draw();
