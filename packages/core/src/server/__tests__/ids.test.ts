import { describe, expect, it } from "vitest";
import { newGameId, newPlayerId, newShipId } from "../ids";

describe("newGameId", () => {
  it("returns an 8-character hex string", () => {
    expect(newGameId()).toMatch(/^[0-9a-f]{8}$/);
  });

  it("generates 1 000 unique IDs", () => {
    const ids = new Set(Array.from({ length: 1_000 }, newGameId));
    expect(ids.size).toBe(1_000);
  });
});

describe("newPlayerId", () => {
  it("returns a UUID v4", () => {
    expect(newPlayerId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("generates 1 000 unique IDs", () => {
    const ids = new Set(Array.from({ length: 1_000 }, newPlayerId));
    expect(ids.size).toBe(1_000);
  });
});

describe("newShipId", () => {
  it("returns a 12-character hex string", () => {
    expect(newShipId()).toMatch(/^[0-9a-f]{12}$/);
  });

  it("generates 1 000 unique IDs", () => {
    const ids = new Set(Array.from({ length: 1_000 }, newShipId));
    expect(ids.size).toBe(1_000);
  });
});
