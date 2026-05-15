import { describe, expect, it } from "vitest";
import { makeFakeClock } from "../clock";
import { defaultFleetConfig } from "../fleet";
import {
  ShipPlacement,
  addSecondPlayer,
  createGame,
  createPlayer,
  forfeitGame,
  handleTurnTimeout,
  placeFleet,
  processShot,
} from "../game";
import { makeSeededRng } from "../rng";
import { GameRuleError } from "../rules";
import { GameConfig, GameState, PlayerState } from "../types";

function sequentialIdFactory(prefix = "ship"): () => string {
  let n = 0;
  return () => `${prefix}-${n++}`;
}

function defaultConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    mode: "Classic",
    fleet: defaultFleetConfig(),
    turnTimerMs: 60_000,
    ...overrides,
  };
}

function newGameInPlacement(opts: { config?: Partial<GameConfig> } = {}): {
  game: GameState;
  hostId: string;
  joinerId: string;
} {
  const clock = makeFakeClock(1_000);
  const host = createPlayer("host", "Host");
  const game = createGame({
    id: "g1",
    config: defaultConfig(opts.config),
    host,
    clock,
  });
  const joined = addSecondPlayer(game, createPlayer("joiner", "Joiner"), {
    idFactory: sequentialIdFactory(),
  });
  return { game: joined, hostId: "host", joinerId: "joiner" };
}

function placeAllShipsAt(
  player: PlayerState,
  startRow: number,
): ShipPlacement[] {
  // Place each ship on its own row to avoid collisions; horizontal at column 0.
  return player.ships.map((s, idx) => ({
    shipId: s.id,
    r: startRow + idx,
    c: 0,
    orientation: "horizontal" as const,
  }));
}

describe("createPlayer", () => {
  it("initializes a player in a fresh state", () => {
    const p = createPlayer("p1", "Alice");
    expect(p.id).toBe("p1");
    expect(p.name).toBe("Alice");
    expect(p.ready).toBe(false);
    expect(p.score).toBe(0);
    expect(p.consecutiveHits).toBe(0);
    expect(p.ships).toEqual([]);
    expect(p.grid.flat().every((c) => c === "empty")).toBe(true);
  });
});

describe("createGame", () => {
  it("starts in lobby with one player and no active player", () => {
    const clock = makeFakeClock(500);
    const game = createGame({
      id: "g1",
      config: defaultConfig(),
      host: createPlayer("host", "Host"),
      clock,
    });
    expect(game.status).toBe("lobby");
    expect(game.activePlayerId).toBeNull();
    expect(Object.keys(game.players)).toEqual(["host"]);
    expect(game.createdAt).toBe(500);
    expect(game.lastActionTime).toBe(500);
    expect(game.turnDeadlineAt).toBeNull();
    expect(game.winnerId).toBeNull();
  });
});

describe("addSecondPlayer", () => {
  it("transitions to placement and builds fleets for both players", () => {
    const { game } = newGameInPlacement();
    expect(game.status).toBe("placement");
    expect(Object.keys(game.players)).toHaveLength(2);
    expect(game.players.host.ships).toHaveLength(3);
    expect(game.players.joiner.ships).toHaveLength(3);
    for (const s of game.players.host.ships) expect(s.placed).toBe(false);
  });

  it("rejects join when game is not in lobby", () => {
    const { game } = newGameInPlacement();
    expect(() =>
      addSecondPlayer(game, createPlayer("third", "Third"), {
        idFactory: sequentialIdFactory(),
      }),
    ).toThrow(GameRuleError);
  });
});

describe("placeFleet", () => {
  it("marks a player ready when all ships placed legally", () => {
    const { game, hostId } = newGameInPlacement();
    const placements = placeAllShipsAt(game.players[hostId], 0);
    const next = placeFleet(game, hostId, placements, {
      clock: makeFakeClock(),
      rng: makeSeededRng(1),
    });
    expect(next.players[hostId].ready).toBe(true);
    expect(next.status).toBe("placement");
  });

  it("transitions to playing once both players have placed", () => {
    const { game, hostId, joinerId } = newGameInPlacement();
    const clock = makeFakeClock(2_000);
    const rng = makeSeededRng(7);
    let g = placeFleet(game, hostId, placeAllShipsAt(game.players[hostId], 0), {
      clock,
      rng,
    });
    g = placeFleet(g, joinerId, placeAllShipsAt(game.players[joinerId], 0), {
      clock,
      rng,
    });
    expect(g.status).toBe("playing");
    expect(g.activePlayerId === hostId || g.activePlayerId === joinerId).toBe(
      true,
    );
    expect(g.lastActionTime).toBe(2_000);
    expect(g.turnDeadlineAt).toBe(2_000 + g.config.turnTimerMs);
  });

  it("rejects when ship count mismatches", () => {
    const { game, hostId } = newGameInPlacement();
    expect(() =>
      placeFleet(game, hostId, [], {
        clock: makeFakeClock(),
        rng: makeSeededRng(1),
      }),
    ).toThrow(/all 3 ships/);
  });

  it("rejects when a ship is placed off the board", () => {
    const { game, hostId } = newGameInPlacement();
    const bad = placeAllShipsAt(game.players[hostId], 0).map((p, i) =>
      i === 0 ? { ...p, c: 7 } : p,
    );
    expect(() =>
      placeFleet(game, hostId, bad, {
        clock: makeFakeClock(),
        rng: makeSeededRng(1),
      }),
    ).toThrow(/Cannot place/);
  });

  it("rejects when ships collide", () => {
    const { game, hostId } = newGameInPlacement();
    const ships = game.players[hostId].ships;
    const colliding: ShipPlacement[] = ships.map((s) => ({
      shipId: s.id,
      r: 0,
      c: 0,
      orientation: "horizontal",
    }));
    expect(() =>
      placeFleet(game, hostId, colliding, {
        clock: makeFakeClock(),
        rng: makeSeededRng(1),
      }),
    ).toThrow();
  });
});

function startPlayingGame(): {
  game: GameState;
  shooterId: string;
  targetId: string;
} {
  const setup = newGameInPlacement({ config: { mode: "Classic" } });
  const clock = makeFakeClock(0);
  const rng = makeSeededRng(7);
  let g = placeFleet(
    setup.game,
    setup.hostId,
    placeAllShipsAt(setup.game.players[setup.hostId], 0),
    { clock, rng },
  );
  g = placeFleet(
    g,
    setup.joinerId,
    placeAllShipsAt(g.players[setup.joinerId], 0),
    { clock, rng },
  );
  // Force activePlayerId to host for deterministic tests.
  g = { ...g, activePlayerId: setup.hostId };
  return { game: g, shooterId: setup.hostId, targetId: setup.joinerId };
}

describe("processShot — hit / miss / sunk / game over", () => {
  it("marks a miss, resets streak, alternates turn", () => {
    const { game, shooterId, targetId } = startPlayingGame();
    const before = game.players[shooterId].consecutiveHits;
    const out = processShot(game, shooterId, 7, 7, {
      clock: makeFakeClock(500),
    });
    expect(out.result.hit).toBe(false);
    expect(out.result.cellStatus).toBe("miss");
    expect(out.game.activePlayerId).toBe(targetId);
    expect(out.game.players[shooterId].consecutiveHits).toBe(0);
    expect(before).toBe(0);
    expect(out.game.players[targetId].grid[7][7]).toBe("miss");
  });

  it("marks a hit, increments streak, alternates turn", () => {
    // Joiner ships were placed at rows 0..2 col 0.
    const { game, shooterId, targetId } = startPlayingGame();
    const out = processShot(game, shooterId, 2, 0, {
      clock: makeFakeClock(500),
    });
    expect(out.result.hit).toBe(true);
    expect(out.result.cellStatus).toBe("hit");
    expect(out.game.activePlayerId).toBe(targetId);
    expect(out.game.players[shooterId].consecutiveHits).toBe(1);
    expect(out.game.players[targetId].grid[2][0]).toBe("hit");
  });

  it("reports sunkShipType when a ship is fully hit (length-1 submarine)", () => {
    const { game, shooterId } = startPlayingGame();
    // Submarine (length 1) at row 2 col 0
    const out = processShot(game, shooterId, 2, 0, {
      clock: makeFakeClock(500),
    });
    expect(out.result.sunkShipType).toBe("Submarine");
  });

  it("transitions to finished and sets winnerId when all opponent ships are sunk", () => {
    const setup = startPlayingGame();
    const { shooterId } = setup;
    let game = setup.game;
    const fire = (r: number, c: number) => {
      const out = processShot(game, shooterId, r, c, {
        clock: makeFakeClock(0),
      });
      game = { ...out.game, activePlayerId: shooterId };
      return out;
    };
    // Submarine: row 2 col 0 (1 cell)
    fire(2, 0);
    // Destroyer: row 1 cols 0..1 (2 cells)
    fire(1, 0);
    fire(1, 1);
    // Cruiser: row 0 cols 0..2 (3 cells)
    fire(0, 0);
    fire(0, 1);
    const last = fire(0, 2);
    expect(last.result.gameOver).toBe(true);
    expect(last.game.status).toBe("finished");
    expect(last.game.winnerId).toBe(shooterId);
    expect(last.game.activePlayerId).toBeNull();
    expect(last.game.turnDeadlineAt).toBeNull();
  });

  it("floors player score at zero in Risk mode after consecutive misses", () => {
    const setup = newGameInPlacement({ config: { mode: "Risk" } });
    const clock = makeFakeClock(0);
    const rng = makeSeededRng(7);
    let g = placeFleet(
      setup.game,
      setup.hostId,
      placeAllShipsAt(setup.game.players[setup.hostId], 0),
      { clock, rng },
    );
    g = placeFleet(
      g,
      setup.joinerId,
      placeAllShipsAt(g.players[setup.joinerId], 0),
      { clock, rng },
    );
    g = { ...g, activePlayerId: setup.hostId };
    const out = processShot(g, setup.hostId, 7, 7, {
      clock: makeFakeClock(500),
    });
    expect(out.game.players[setup.hostId].score).toBe(0);
    expect(out.result.scoreAwarded).toBe(-1);
  });

  it("throws GameRuleError for an out-of-turn shot", () => {
    const { game, targetId } = startPlayingGame();
    expect(() =>
      processShot(game, targetId, 0, 0, { clock: makeFakeClock(0) }),
    ).toThrow(GameRuleError);
  });

  it("uses injected clock to compute elapsed time for reflex bonus (Elite)", () => {
    const setup = newGameInPlacement({ config: { mode: "Elite" } });
    const rng = makeSeededRng(7);
    let g = placeFleet(
      setup.game,
      setup.hostId,
      placeAllShipsAt(setup.game.players[setup.hostId], 0),
      {
        clock: makeFakeClock(0),
        rng,
      },
    );
    g = placeFleet(
      g,
      setup.joinerId,
      placeAllShipsAt(g.players[setup.joinerId], 0),
      {
        clock: makeFakeClock(0),
        rng,
      },
    );
    g = { ...g, activePlayerId: setup.hostId, lastActionTime: 0 };
    // Shoot a hit (target row 2 col 0 = submarine) within 1s -> reflex bonus applies.
    const out = processShot(g, setup.hostId, 2, 0, {
      clock: makeFakeClock(1_000),
    });
    expect(out.result.hit).toBe(true);
    expect(out.result.scoreAwarded).toBeGreaterThan(10); // base 10 with reflex must exceed 10
  });
});

describe("handleTurnTimeout", () => {
  it("flips the active player and resets the timed-out streak", () => {
    const { game, shooterId, targetId } = startPlayingGame();
    const expired = {
      ...game,
      players: {
        ...game.players,
        [shooterId]: { ...game.players[shooterId], consecutiveHits: 3 },
      },
    };
    const out = handleTurnTimeout(expired, { clock: makeFakeClock(123_456) });
    expect(out.activePlayerId).toBe(targetId);
    expect(out.players[shooterId].consecutiveHits).toBe(0);
    expect(out.lastActionTime).toBe(123_456);
    expect(out.turnDeadlineAt).toBe(123_456 + out.config.turnTimerMs);
  });

  it("throws when called on a non-playing game", () => {
    const lobby = createGame({
      id: "g",
      config: defaultConfig(),
      host: createPlayer("host", "Host"),
      clock: makeFakeClock(0),
    });
    expect(() => handleTurnTimeout(lobby, { clock: makeFakeClock(0) })).toThrow(
      GameRuleError,
    );
  });
});

describe("forfeitGame", () => {
  it("marks the leaving player as loser and opponent as winner", () => {
    const { game, hostId, joinerId } = newGameInPlacement();
    const result = forfeitGame(game, hostId);
    expect(result.status).toBe("finished");
    expect(result.winnerId).toBe(joinerId);
    expect(result.activePlayerId).toBeNull();
    expect(result.turnDeadlineAt).toBeNull();
  });

  it("works from any game status with two players", () => {
    const { game, hostId, joinerId } = newGameInPlacement();
    expect(forfeitGame(game, joinerId).winnerId).toBe(hostId);
  });

  it("is a no-op when the game is already finished", () => {
    const { game, hostId } = newGameInPlacement();
    const finished = { ...game, status: "finished" as const, winnerId: hostId };
    const result = forfeitGame(finished, hostId);
    expect(result).toBe(finished);
  });
});
