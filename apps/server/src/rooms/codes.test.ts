import { describe, expect, it } from "vitest";
import { generateRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./codes";

describe("generateRoomCode", () => {
  it("uses only the alphabet", () => {
    const pattern = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);
    for (let i = 0; i < 1000; i++) {
      expect(generateRoomCode()).toMatch(pattern);
    }
  });

  it("leaves out look-alike characters", () => {
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01ILO]/);
    expect(ROOM_CODE_LENGTH).toBe(5);
  });
});
