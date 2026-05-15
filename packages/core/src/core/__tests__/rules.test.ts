import { describe, expect, it } from "vitest";
import { createEmptyGrid } from "../board";
import { makeSeededRng } from "../rng";
import {
  GameRuleError,
  decideFirstPlayer,
  getOpponentId,
  isGameOver,
  nextActivePlayer,
  validateShot,
} from "../rules";
import { GameState, PlayerState, Ship } from "../types";

function makePlayer(id: string): PlayerState {
  return {
    id,
    name: id,
    grid: createEmptyGrid(),
    ships: [],
    score: 0,
    consecutiveHits: 0,
    ready: true,
  };
}

function makeGame(overrides: Partial<GameState> = {}): GameState {
  const p1 = makePlayer("p1");
  const p2 = makePlayer("p2");
  return {
    id: "g1",
    status: "playing",
    config: { mode: "Classic", fleet: {}, turnTimerMs: 60_000 },
    players: { p1, p2 },
    activePlayerId: "p1",
    lastActionTime: 0,
    createdAt: 0,
    turnDeadlineAt: null,
    winnerId: null,
    ...overrides,
  };
}

describe("getOpponentId", () => {
  it("returns the other player id", () => {
    const game = makeGame();
    expect(getOpponentId(game, "p1")).toBe("p2");
    expect(getOpponentId(game, "p2")).toBe("p1");
  });

  it("throws when a game does not have exactly two players", () => {
    const lone = makeGame();
    delete (lone.players as Record<string, PlayerState>).p2;
    expect(() => getOpponentId(lone, "p1")).toThrow(GameRuleError);
  });

  it("throws when the player is not part of the game", () => {
    expect(() => getOpponentId(makeGame(), "ghost")).toThrow(/Unknown player/);
  });
});

describe("nextActivePlayer", () => {
  it("alternates regardless of hit or miss", () => {
    const game = makeGame();
    expect(nextActivePlayer(game, "p1")).toBe("p2");
    expect(nextActivePlayer(game, "p2")).toBe("p1");
  });
});

describe("decideFirstPlayer", () => {
  it("is deterministic for a given seed", () => {
    const ids = ["p1", "p2"];
    const a = decideFirstPlayer(makeSeededRng(42), ids);
    const b = decideFirstPlayer(makeSeededRng(42), ids);
    expect(a).toBe(b);
  });

  it("returns one of the supplied ids", () => {
    const ids = ["alpha", "beta"];
    for (let seed = 0; seed < 20; seed++) {
      expect(ids).toContain(decideFirstPlayer(makeSeededRng(seed), ids));
    }
  });

  it("produces both outcomes across many seeds (not always biased to first)", () => {
    const ids = ["p1", "p2"];
    const counts = { p1: 0, p2: 0 } as Record<string, number>;
    for (let seed = 0; seed < 200; seed++) {
      counts[decideFirstPlayer(makeSeededRng(seed), ids)]++;
    }
    expect(counts.p1).toBeGreaterThan(50);
    expect(counts.p2).toBeGreaterThan(50);
  });

  it("throws when given an empty list", () => {
    expect(() => decideFirstPlayer(makeSeededRng(1), [])).toThrow(
      GameRuleError,
    );
  });
});

describe("validateShot", () => {
  it("passes for a legal shot", () => {
    expect(() => validateShot(makeGame(), "p1", 0, 0)).not.toThrow();
  });

  it("throws NOT_PLAYING when game is not in playing state", () => {
    const game = makeGame({ status: "placement" });
    expect(() => validateShot(game, "p1", 0, 0)).toThrow(/playing/);
  });

  it("throws WRONG_TURN when shooter is not the active player", () => {
    expect(() => validateShot(makeGame(), "p2", 0, 0)).toThrow(/turn/);
  });

  it("throws OUT_OF_BOUNDS for invalid coordinates", () => {
    expect(() => validateShot(makeGame(), "p1", -1, 0)).toThrow(
      /out of bounds/i,
    );
    expect(() => validateShot(makeGame(), "p1", 0, 99)).toThrow(
      /out of bounds/i,
    );
  });

  it("throws ALREADY_SHOT when targeting a hit cell", () => {
    const game = makeGame();
    game.players.p2.grid[3][3] = "hit";
    expect(() => validateShot(game, "p1", 3, 3)).toThrow(/already shot/i);
  });

  it("throws ALREADY_SHOT when targeting a miss cell", () => {
    const game = makeGame();
    game.players.p2.grid[3][3] = "miss";
    expect(() => validateShot(game, "p1", 3, 3)).toThrow(/already shot/i);
  });

  it("attaches a typed error code", () => {
    try {
      validateShot(makeGame(), "p2", 0, 0);
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(GameRuleError);
      expect((e as GameRuleError).code).toBe("WRONG_TURN");
    }
  });
});

describe("isGameOver", () => {
  function sunkShip(): Ship {
    return {
      id: "s",
      type: "Submarine",
      length: 1,
      hits: 1,
      positions: [],
      placed: true,
    };
  }
  function aliveShip(): Ship {
    return {
      id: "s",
      type: "Submarine",
      length: 1,
      hits: 0,
      positions: [],
      placed: true,
    };
  }

  it("returns true when every opponent ship is fully hit", () => {
    expect(isGameOver([sunkShip(), sunkShip()])).toBe(true);
  });

  it("returns false when any opponent ship is still afloat", () => {
    expect(isGameOver([sunkShip(), aliveShip()])).toBe(false);
  });

  it("returns false when the opponent has no ships at all", () => {
    expect(isGameOver([])).toBe(false);
  });
});
