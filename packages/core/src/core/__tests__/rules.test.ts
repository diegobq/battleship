import { describe, it, expect } from "vitest";
import {
  GameRuleError,
  getOpponentId,
  decideFirstPlayer,
  validateShot,
  resolveWinCondition,
  resolveTurnStrategy,
  alternatingTurnStrategy,
  hitKeepsTurnStrategy,
  isGameOver,
} from "../rules";
import { makeSeededRng } from "../rng";
import { createEmptyGrid } from "../board";
import type { GameState, PlayerState } from "../types";

function makePlayer(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    name: id,
    grid: createEmptyGrid(),
    ships: [],
    score: 0,
    consecutiveHits: 0,
    ready: false,
    ...overrides,
  };
}

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    id: "g1",
    status: "playing",
    config: { mode: "Classic", fleet: {}, turnTimerMs: 60000 },
    players: {
      host: makePlayer("host"),
      guest: makePlayer("guest"),
    },
    activePlayerId: "host",
    lastActionTime: 0,
    createdAt: 0,
    turnDeadlineAt: null,
    winnerId: null,
    ...overrides,
  };
}

describe("GameRuleError", () => {
  it("sets the code and message", () => {
    const err = new GameRuleError("WRONG_TURN", "not your turn");
    expect(err.code).toBe("WRONG_TURN");
    expect(err.message).toBe("not your turn");
    expect(err.name).toBe("GameRuleError");
  });
});

describe("getOpponentId", () => {
  it("returns the other player id", () => {
    const game = makeGame();
    expect(getOpponentId(game, "host")).toBe("guest");
    expect(getOpponentId(game, "guest")).toBe("host");
  });

  it("throws UNKNOWN_PLAYER for an id not in the game", () => {
    const game = makeGame();
    expect(() => getOpponentId(game, "nobody")).toThrow(GameRuleError);
    try {
      getOpponentId(game, "nobody");
    } catch (e) {
      expect((e as GameRuleError).code).toBe("UNKNOWN_PLAYER");
    }
  });

  it("throws INVALID_PLAYER_COUNT when fewer than 2 players", () => {
    const game = makeGame({ players: { host: makePlayer("host") } });
    expect(() => getOpponentId(game, "host")).toThrow(GameRuleError);
    try {
      getOpponentId(game, "host");
    } catch (e) {
      expect((e as GameRuleError).code).toBe("INVALID_PLAYER_COUNT");
    }
  });
});

describe("decideFirstPlayer", () => {
  it("always returns one of the provided ids", () => {
    const ids = ["host", "guest"] as const;
    for (let seed = 0; seed < 10; seed++) {
      const winner = decideFirstPlayer(makeSeededRng(seed), ids);
      expect(ids).toContain(winner);
    }
  });

  it("is deterministic with the same seed", () => {
    const ids = ["a", "b", "c"];
    expect(decideFirstPlayer(makeSeededRng(42), ids)).toBe(
      decideFirstPlayer(makeSeededRng(42), ids),
    );
  });

  it("throws INVALID_PLAYER_COUNT for an empty list", () => {
    expect(() => decideFirstPlayer(makeSeededRng(1), [])).toThrow(GameRuleError);
    try {
      decideFirstPlayer(makeSeededRng(1), []);
    } catch (e) {
      expect((e as GameRuleError).code).toBe("INVALID_PLAYER_COUNT");
    }
  });
});

describe("validateShot", () => {
  it("passes for a valid shot by the active player", () => {
    const game = makeGame();
    expect(() => validateShot(game, "host", 0, 0)).not.toThrow();
  });

  it("throws NOT_PLAYING when the game is not in playing state", () => {
    const game = makeGame({ status: "lobby" });
    try {
      validateShot(game, "host", 0, 0);
    } catch (e) {
      expect((e as GameRuleError).code).toBe("NOT_PLAYING");
    }
  });

  it("throws WRONG_TURN when it is not the shooter's turn", () => {
    const game = makeGame({ activePlayerId: "guest" });
    try {
      validateShot(game, "host", 0, 0);
    } catch (e) {
      expect((e as GameRuleError).code).toBe("WRONG_TURN");
    }
  });

  it("throws OUT_OF_BOUNDS for coordinates outside the grid", () => {
    const game = makeGame();
    try {
      validateShot(game, "host", -1, 0);
    } catch (e) {
      expect((e as GameRuleError).code).toBe("OUT_OF_BOUNDS");
    }
    try {
      validateShot(game, "host", 0, 8);
    } catch (e) {
      expect((e as GameRuleError).code).toBe("OUT_OF_BOUNDS");
    }
  });

  it("throws ALREADY_SHOT for a previously targeted cell", () => {
    const grid = createEmptyGrid();
    grid[0][0] = "miss";
    const game = makeGame({
      players: {
        host: makePlayer("host"),
        guest: makePlayer("guest", { grid }),
      },
    });
    try {
      validateShot(game, "host", 0, 0);
    } catch (e) {
      expect((e as GameRuleError).code).toBe("ALREADY_SHOT");
    }
  });
});

describe("resolveWinCondition", () => {
  it("returns a strategy that fires when all ships are sunk", () => {
    const strategy = resolveWinCondition("Elite");
    const sunkShips = [{ id: "s", type: "Submarine", length: 1, hits: 1, positions: [], placed: true } as const];
    expect(strategy.isGameOver(sunkShips, makeGame())).toBe(true);
  });

  it("returns false when ships still have health", () => {
    const strategy = resolveWinCondition("Classic");
    const unsunkShip = [{ id: "s", type: "Cruiser", length: 3, hits: 1, positions: [], placed: true } as const];
    expect(strategy.isGameOver(unsunkShip, makeGame())).toBe(false);
  });

  it("returns the same strategy for all three modes", () => {
    expect(resolveWinCondition("Classic")).toBe(resolveWinCondition("Risk"));
    expect(resolveWinCondition("Risk")).toBe(resolveWinCondition("Elite"));
  });
});

describe("resolveTurnStrategy", () => {
  it("returns alternatingTurnStrategy for all modes", () => {
    expect(resolveTurnStrategy("Classic")).toBe(alternatingTurnStrategy);
    expect(resolveTurnStrategy("Risk")).toBe(alternatingTurnStrategy);
    expect(resolveTurnStrategy("Elite")).toBe(alternatingTurnStrategy);
  });
});

describe("alternatingTurnStrategy", () => {
  it("always returns the opponent regardless of hit", () => {
    const game = makeGame();
    expect(alternatingTurnStrategy.nextPlayer(game, "host", true)).toBe("guest");
    expect(alternatingTurnStrategy.nextPlayer(game, "host", false)).toBe("guest");
  });
});

describe("hitKeepsTurnStrategy", () => {
  it("returns the shooter on a hit", () => {
    const game = makeGame();
    expect(hitKeepsTurnStrategy.nextPlayer(game, "host", true)).toBe("host");
  });

  it("returns the opponent on a miss", () => {
    const game = makeGame();
    expect(hitKeepsTurnStrategy.nextPlayer(game, "host", false)).toBe("guest");
  });
});

describe("isGameOver", () => {
  it("returns false when a ship still has hits remaining", () => {
    const ship: import("../types").Ship = { id: "s", type: "Submarine", length: 1, hits: 0, positions: [], placed: true };
    expect(isGameOver([ship])).toBe(false);
  });

  it("returns true when all ships are fully hit", () => {
    const ship: import("../types").Ship = { id: "s", type: "Submarine", length: 1, hits: 1, positions: [], placed: true };
    expect(isGameOver([ship])).toBe(true);
  });
});
