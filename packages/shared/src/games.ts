import { z } from "zod";

// The games rooms can play, as the client lists them before any room exists,
// and the settings the host picks when creating a room. The server's
// GameModule for each game takes its id, player counts and options from here,
// so the two can't drift.

/** A setting's value. Plain JSON, so it travels as is in requests and states. */
export const SettingValue = z.union([z.string(), z.number(), z.boolean()]);
export type SettingValue = z.infer<typeof SettingValue>;

/** One choice the create form offers and the lobby shows. */
export interface SettingChoice<T extends SettingValue = SettingValue> {
  value: T;
  /** Lowercase, so it reads in a sentence: "Turn timer: 1 minute". */
  label: string;
}

/** A room setting with a fixed list of choices. */
export interface Setting<T extends SettingValue = SettingValue> {
  /** The key in requests and in `RoomState`. */
  key: string;
  label: string;
  choices: readonly SettingChoice<T>[];
  default: T;
}

export interface GameInfo {
  /** Stable id, sent as `CreateRoomRequest.game` and stored on the room. */
  id: string;
  /** Display name. */
  name: string;
  /** The player counts a game can start with, ascending. */
  playerCounts: readonly number[];
  /**
   * Settings only this game has, chosen in the create form after the ones
   * every room has (`ROOM_SETTINGS`). The server checks them with
   * `parseOptions` and hands them to the game.
   */
  options: readonly Setting[];
}

/**
 * How long each turn may take, in seconds; 0 is off. When it runs out, the
 * server forfeits the turn and play moves on. Every game has it.
 */
export const TURN_TIMER = {
  key: "turnTimer",
  label: "Turn timer",
  choices: [
    { value: 0, label: "off" },
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 300, label: "5 minutes" },
  ],
  default: 60,
} as const satisfies Setting<number>;

/** The settings every room has, whatever the game. */
export const ROOM_SETTINGS: readonly Setting[] = [TURN_TIMER];

export const RoomSettings = z.object({
  turnTimer: z.literal(TURN_TIMER.choices.map((c) => c.value)).default(TURN_TIMER.default),
});
export type RoomSettings = z.infer<typeof RoomSettings>;

/** A game's options, keyed by `Setting.key`. */
export const GameOptions = z.record(z.string(), SettingValue);
export type GameOptions = z.infer<typeof GameOptions>;

/**
 * `input` checked against a game's `options`, with missing ones at their
 * default. Null for an unknown key or a value that isn't one of the choices.
 */
export function parseOptions(options: readonly Setting[], input: unknown): GameOptions | null {
  const schema = z.strictObject(
    Object.fromEntries(
      options.map((o) => [o.key, z.literal(o.choices.map((c) => c.value)).default(o.default)]),
    ),
  );
  const result = schema.safeParse(input);
  return result.success ? result.data : null;
}

/** The label of `setting`'s choice for `value`, or of its default if `value` isn't one. */
export function choiceLabel(setting: Setting, value: SettingValue | undefined): string {
  const choice =
    setting.choices.find((c) => c.value === value) ??
    setting.choices.find((c) => c.value === setting.default);
  return choice?.label ?? String(setting.default);
}

/** Corners: mark the squares where the moving player's next piece could go. */
export const HINTS = {
  key: "hints",
  label: "Hints",
  choices: [
    { value: false, label: "off" },
    { value: true, label: "on" },
  ],
  default: false,
} as const satisfies Setting<boolean>;

export const CORNERS = {
  id: "corners",
  name: "Corners",
  playerCounts: [2, 3, 4],
  options: [HINTS],
} as const satisfies GameInfo;

/** Every game, in the order the landing page lists them. */
export const GAMES: readonly GameInfo[] = [CORNERS];

/** The catalog entry for `id`, or undefined if there is no such game. */
export const gameInfo = (id: string): GameInfo | undefined => GAMES.find((game) => game.id === id);

/** The player range as shown next to a game: "2–4", or "4" for a single count. */
export function playerRange(counts: readonly number[]): string {
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min === max ? `${min}` : `${min}–${max}`;
}

/** The player range in words, for screen readers: "2 to 4 players". */
export function playerRangeLabel(counts: readonly number[]): string {
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min !== max) return `${min} to ${max} players`;
  return `${min} ${min === 1 ? "player" : "players"}`;
}
