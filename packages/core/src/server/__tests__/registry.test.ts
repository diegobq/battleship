import { describe, it, expect, beforeEach } from "vitest";
import {
  getRegistry,
  __resetRegistryForTests,
  isRegistryInitialized,
} from "../registry";
import { makeFakeClock } from "../../core/clock";
import { createGame, createPlayer } from "../../core/game";
import type { GameState } from "../../core/types";

const CONFIG = {
  mode: "Classic",
  fleet: { Submarine: 1 },
  turnTimerMs: 60_000,
} as const;

function makeGame(
  id: string,
  status: GameState["status"] = "lobby",
): GameState {
  const host = createPlayer("host", "Host");
  const game = createGame({ id, config: CONFIG, host, clock: makeFakeClock() });
  return { ...game, status };
}

describe("GameRegistry (InMemory)", () => {
  beforeEach(() => __resetRegistryForTests());

  it("create stores a game and get retrieves it", () => {
    const reg = getRegistry();
    const game = makeGame("g1");
    reg.create(game);
    expect(reg.get("g1")).toEqual(game);
  });

  it("get returns undefined for an unknown id", () => {
    expect(getRegistry().get("missing")).toBeUndefined();
  });

  it("create throws if a game with the same id already exists", () => {
    const reg = getRegistry();
    reg.create(makeGame("dup"));
    expect(() => reg.create(makeGame("dup"))).toThrow();
  });

  it("update applies the transform and returns the next state", () => {
    const reg = getRegistry();
    reg.create(makeGame("g1"));
    const updated = reg.update("g1", (g) => ({ ...g, status: "playing" }));
    expect(updated?.status).toBe("playing");
    expect(reg.get("g1")?.status).toBe("playing");
  });

  it("update returns undefined for an unknown id", () => {
    expect(getRegistry().update("x", (g) => g)).toBeUndefined();
  });

  it("list returns all stored games", () => {
    const reg = getRegistry();
    reg.create(makeGame("g1"));
    reg.create(makeGame("g2"));
    expect(reg.list()).toHaveLength(2);
  });

  it("listJoinable returns only lobby games with one player", () => {
    const reg = getRegistry();
    reg.create(makeGame("lobby1", "lobby"));
    reg.create(makeGame("playing1", "playing"));
    const joinable = reg.listJoinable();
    expect(joinable).toHaveLength(1);
    expect(joinable[0].id).toBe("lobby1");
  });

  it("delete removes the game and returns true", () => {
    const reg = getRegistry();
    reg.create(makeGame("g1"));
    expect(reg.delete("g1")).toBe(true);
    expect(reg.get("g1")).toBeUndefined();
  });

  it("delete returns false for an unknown id", () => {
    expect(getRegistry().delete("nope")).toBe(false);
  });

  it("__resetRegistryForTests creates a fresh instance on next getRegistry()", () => {
    const reg = getRegistry();
    reg.create(makeGame("g1"));
    __resetRegistryForTests();
    expect(getRegistry().get("g1")).toBeUndefined();
  });

  it("isRegistryInitialized returns true after getRegistry() and false after reset", () => {
    getRegistry();
    expect(isRegistryInitialized()).toBe(true);
    __resetRegistryForTests();
    expect(isRegistryInitialized()).toBe(false);
  });
});
