import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  setPlayerId,
  getPlayerId,
  clearPlayerId,
  usePlayerId,
} from "../playerSession";

beforeEach(() => {
  sessionStorage.clear();
});

describe("setPlayerId / getPlayerId", () => {
  it("stores and retrieves a playerId for a given gameId", () => {
    setPlayerId("g1", "player-abc");
    expect(getPlayerId("g1")).toBe("player-abc");
  });

  it("scopes storage per gameId — different keys do not collide", () => {
    setPlayerId("g1", "alice");
    setPlayerId("g2", "bob");
    expect(getPlayerId("g1")).toBe("alice");
    expect(getPlayerId("g2")).toBe("bob");
  });

  it("returns null for a gameId with no stored playerId", () => {
    expect(getPlayerId("unknown")).toBeNull();
  });

  it("overwrites an existing playerId", () => {
    setPlayerId("g1", "old");
    setPlayerId("g1", "new");
    expect(getPlayerId("g1")).toBe("new");
  });
});

describe("clearPlayerId", () => {
  it("removes the stored playerId", () => {
    setPlayerId("g1", "player-abc");
    clearPlayerId("g1");
    expect(getPlayerId("g1")).toBeNull();
  });

  it("is a no-op when nothing is stored for that gameId", () => {
    expect(() => clearPlayerId("nothing")).not.toThrow();
  });
});

describe("usePlayerId", () => {
  it("returns the stored playerId for a game", () => {
    setPlayerId("g1", "p123");
    const { result } = renderHook(() => usePlayerId("g1"));
    expect(result.current).toBe("p123");
  });

  it("returns null when no playerId is stored for a game", () => {
    const { result } = renderHook(() => usePlayerId("unknown"));
    expect(result.current).toBeNull();
  });
});
