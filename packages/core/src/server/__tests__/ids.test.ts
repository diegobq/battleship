import { describe, it, expect } from "vitest";
import { newGameId, newPlayerId, newShipId } from "../ids";

describe("newGameId", () => {
  it("returns an 8-character string", () => {
    expect(newGameId()).toHaveLength(8);
  });

  it("returns unique values across successive calls", () => {
    const ids = new Set(Array.from({ length: 200 }, newGameId));
    expect(ids.size).toBe(200);
  });
});

describe("newPlayerId", () => {
  it("returns a UUID v4 formatted string (36 chars, dashes in right places)", () => {
    const id = newPlayerId();
    expect(id).toHaveLength(36);
    expect(id[8]).toBe("-");
    expect(id[13]).toBe("-");
    expect(id[18]).toBe("-");
    expect(id[23]).toBe("-");
  });

  it("returns unique values across successive calls", () => {
    const ids = new Set(Array.from({ length: 200 }, newPlayerId));
    expect(ids.size).toBe(200);
  });
});

describe("newShipId", () => {
  it("returns a 12-character string with no dashes", () => {
    const id = newShipId();
    expect(id).toHaveLength(12);
    expect(id.includes("-")).toBe(false);
  });

  it("returns unique values across successive calls", () => {
    const ids = new Set(Array.from({ length: 200 }, newShipId));
    expect(ids.size).toBe(200);
  });
});
