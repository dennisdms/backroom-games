import type { WebSocket } from "ws";

/** One WebSocket connection, and the seat it took with `hello`. */
export interface Client {
  socket: WebSocket;
  at: { code: string; seat: number } | null;
}

/**
 * Which connections are in which room. A seat is online while at least one
 * connection holds it (a player may have the room open in two tabs).
 */
export class Sessions {
  private readonly rooms = new Map<string, Set<Client>>();

  /** Puts `client` in a seat. Returns true if the seat just came online. */
  attach(client: Client, code: string, seat: number): boolean {
    const cameOnline = !this.online(code, seat);
    client.at = { code, seat };
    const clients = this.rooms.get(code) ?? new Set();
    clients.add(client);
    this.rooms.set(code, clients);
    return cameOnline;
  }

  /** Takes `client` out of its seat. Returns true if the seat just went offline. */
  detach(client: Client): boolean {
    const { at } = client;
    if (!at) return false;
    client.at = null;
    const clients = this.rooms.get(at.code);
    clients?.delete(client);
    if (clients?.size === 0) this.rooms.delete(at.code);
    return !this.online(at.code, at.seat);
  }

  online(code: string, seat: number): boolean {
    return this.clients(code).some((c) => c.at?.seat === seat);
  }

  clients(code: string): Client[] {
    return [...(this.rooms.get(code) ?? [])];
  }
}
