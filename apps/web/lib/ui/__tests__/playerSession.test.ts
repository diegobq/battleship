import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearPlayerId, getPlayerId, setPlayerId } from "../playerSession";

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("setPlayerId / getPlayerId", () => {
  it("stores and retrieves the playerId for a given game", () => {
    setPlayerId("g1", "p1");
    expect(getPlayerId("g1")).toBe("p1");
  });

  it("returns null for a game that was never set", () => {
    expect(getPlayerId("unknown")).toBeNull();
  });

  it("scopes values by gameId — different games return different ids", () => {
    setPlayerId("g1", "p1");
    setPlayerId("g2", "p2");
    expect(getPlayerId("g1")).toBe("p1");
    expect(getPlayerId("g2")).toBe("p2");
  });

  it("overwrites an existing entry", () => {
    setPlayerId("g1", "p1");
    setPlayerId("g1", "p2");
    expect(getPlayerId("g1")).toBe("p2");
  });
});

describe("clearPlayerId", () => {
  it("removes the stored id so getPlayerId returns null", () => {
    setPlayerId("g1", "p1");
    clearPlayerId("g1");
    expect(getPlayerId("g1")).toBeNull();
  });

  it("is a no-op when no id was stored", () => {
    expect(() => clearPlayerId("never-set")).not.toThrow();
  });
});
