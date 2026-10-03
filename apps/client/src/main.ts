import { html, render } from "lit-html";
import { parseRoute, type Route } from "./routes";
import { type ConnectionStatus, connect } from "./socket";
import "./styles/main.css";
import { createLandingState, landing } from "./views/landing";
import { room } from "./views/room";

// The whole client model (see CLAUDE.md): state lives in plain variables, any
// change calls draw(), and views are functions that return templates.

let route: Route = parseRoute(location.pathname);
let connection: ConnectionStatus = "connecting";
const landingState = createLandingState();

const root = document.getElementById("app");
if (!root) throw new Error("missing #app element");

/** Programmatic navigation: push to history, update route, redraw. */
function navigate(path: string) {
  history.pushState(null, "", path);
  route = parseRoute(path);
  draw();
}

function draw() {
  render(view(), root as HTMLElement);
}

function view() {
  return html`${route.name === "room" ? room(route.code) : landing(landingState, { draw, navigate })}
    <footer>
      Server: <span data-testid="connection" class="status ${connection}">${statusText[connection]}</span>
    </footer>`;
}

const statusText: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  open: "Connected",
  closed: "Reconnecting…",
};

window.addEventListener("popstate", () => {
  route = parseRoute(location.pathname);
  draw();
});

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
