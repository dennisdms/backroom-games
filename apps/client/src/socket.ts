import { type ClientMessage, parseServerMessage, type ServerMessage } from "@backroom/shared";

export type ConnectionStatus = "connecting" | "open" | "closed";

interface Handlers {
  onStatus: (status: ConnectionStatus) => void;
  onMessage: (message: ServerMessage) => void;
}

const HEARTBEAT_MS = 25_000;
const MAX_BACKOFF_MS = 10_000;

/**
 * Keeps a WebSocket to the server open: reconnects with exponential backoff and
 * sends a heartbeat ping so proxies don't close an idle connection. Treat every
 * reconnect as a fresh sync; the server sends full state, never diffs.
 */
export function connect({ onStatus, onMessage }: Handlers) {
  let socket: WebSocket;
  let attempt = 0;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const send = (message: ClientMessage) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  const open = () => {
    onStatus("connecting");
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${location.host}/ws`);

    socket.addEventListener("open", () => {
      attempt = 0;
      send({ type: "ping" });
      heartbeat = setInterval(() => send({ type: "ping" }), HEARTBEAT_MS);
    });

    socket.addEventListener("message", (event) => {
      const message = parseServerMessage(String(event.data));
      if (!message) return;
      // The first pong confirms the server speaks our protocol.
      if (message.type === "pong") onStatus("open");
      onMessage(message);
    });

    socket.addEventListener("close", () => {
      clearInterval(heartbeat);
      onStatus("closed");
      const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt++);
      setTimeout(open, delay);
    });
  };

  open();
  return { send };
}
