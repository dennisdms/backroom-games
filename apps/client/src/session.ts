import type { RoomState, ServerMessage } from "@backroom/shared";

/** The room this client is in, as the server last described it. */
export interface Session {
  code: string;
  /** Null until the server answers `hello` with `welcome`. */
  room: RoomState | null;
  /** The server's last `error` message, cleared by the next state. */
  error: string | null;
  /**
   * The server said it is restarting. True until the new one answers `hello`
   * with a state, or with an error if the restart lost the room.
   */
  restarting: boolean;
}

export const newSession = (code: string): Session => ({
  code,
  room: null,
  error: null,
  restarting: false,
});

/**
 * The session after a server message. Room states for other rooms, and older
 * ones than we have (messages can cross a reconnect), are dropped.
 */
export function receive(session: Session, message: ServerMessage): Session {
  switch (message.type) {
    case "welcome":
    case "roomState": {
      const { room } = message;
      if (room.code !== session.code) return session;
      if (session.room && room.version < session.room.version) return session;
      return { ...session, room, error: null, restarting: false };
    }
    case "playerPresence": {
      if (!session.room) return session;
      const players = session.room.players.map((p) =>
        p.seat === message.seat ? { ...p, online: message.online } : p,
      );
      return { ...session, room: { ...session.room, players } };
    }
    case "error":
      return { ...session, error: message.message, restarting: false };
    case "serverRestarting":
      return { ...session, restarting: true };
    default:
      return session;
  }
}
