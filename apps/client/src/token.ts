/**
 * Reads the `?player=N` query parameter to namespace stored tokens, so several
 * players can be tested in one browser using different tabs.
 */
function playerSlot(): string {
  const slot = new URLSearchParams(location.search).get("player");
  return slot ?? "";
}

function storageKey(roomCode: string): string {
  const slot = playerSlot();
  return slot ? `token:${roomCode}:${slot}` : `token:${roomCode}`;
}

export function getToken(roomCode: string): string | null {
  return localStorage.getItem(storageKey(roomCode));
}

export function setToken(roomCode: string, token: string): void {
  localStorage.setItem(storageKey(roomCode), token);
}
