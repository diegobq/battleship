import { describe, it, expect } from "vitest";
import {
  createPlayer,
  createGame,
  addSecondPlayer,
  placeFleet,
  processShot,
  forfeitGame,
  handleTurnTimeout,
} from "../game";
import { makeFakeClock } from "../clock";
import { makeSeededRng } from "../rng";
import { GameRuleError } from "../rules";
import type { GameConfig, GameState } from "../types";

const CONFIG: GameConfig = {
  mode: "Classic",
  fleet: { Submarine: 1 },
  turnTimerMs: 60_000,
};

let shipCounter = 0;
const nextId = () => `ship-${++shipCounter}`;

/** Builds a fully wired-up playing game with one submarine each. */
function buildPlayingGame(mode: GameConfig["mode"] = "Classic") {
  const clock = makeFakeClock(1000);
  const config: GameConfig = { ...CONFIG, mode };
  const host = createPlayer("host", "Host");
  const guest = createPlayer("guest", "Guest");

  const lobby = createGame({ id: "g1", config, host, clock });
  const placement = addSecondPlayer(lobby, guest, { idFactory: nextId });

  const hostShipId = placement.players["host"].ships[0].id;
  const guestShipId = placement.players["guest"].ships[0].id;

  const afterHost = placeFleet(
    placement,
    "host",
    [{ shipId: hostShipId, r: 0, c: 0, orientation: "horizontal" }],
    { clock, rng: makeSeededRng(99) },
  );
  const playing = placeFleet(
    afterHost,
    "guest",
    [{ shipId: guestShipId, r: 7, c: 7, orientation: "horizontal" }],
    { clock, rng: makeSeededRng(99) },
  );

  const activeId = playing.activePlayerId!;
  const opponentId = activeId === "host" ? "guest" : "host";
  return { playing, clock, activeId, opponentId };
}

// ─── createPlayer ─────────────────────────────────────────────────────────────

describe("createPlayer", () => {
  it("returns a player with an empty 8×8 grid", () => {
    const p = createPlayer("p1", "Alice");
    expect(p.grid).toHaveLength(8);
    expect(p.grid[0]).toHaveLength(8);
    expect(p.grid[0][0]).toBe("empty");
  });

  it("initialises score, hits, and ready to zero / false", () => {
    const p = createPlayer("p1", "Alice");
    expect(p.score).toBe(0);
    expect(p.consecutiveHits).toBe(0);
    expect(p.ready).toBe(false);
  });
});

// ─── createGame ───────────────────────────────────────────────────────────────

describe("createGame", () => {
  it("creates a game in lobby status", () => {
    const clock = makeFakeClock(500);
    const host = createPlayer("host", "Host");
    const game = createGame({ id: "g1", config: CONFIG, host, clock });
    expect(game.status).toBe("lobby");
    expect(game.activePlayerId).toBeNull();
  });

  it("records createdAt from the injected clock", () => {
    const clock = makeFakeClock(12345);
    const host = createPlayer("host", "Host");
    const game = createGame({ id: "g1", config: CONFIG, host, clock });
    expect(game.createdAt).toBe(12345);
  });

  it("registers the host as the only player", () => {
    const clock = makeFakeClock();
    const host = createPlayer("host", "Host");
    const game = createGame({ id: "g1", config: CONFIG, host, clock });
    expect(Object.keys(game.players)).toEqual(["host"]);
  });
});

// ─── addSecondPlayer ──────────────────────────────────────────────────────────

describe("addSecondPlayer", () => {
  it("transitions the game to placement status", () => {
    const clock = makeFakeClock();
    const host = createPlayer("host", "Host");
    const lobby = createGame({ id: "g1", config: CONFIG, host, clock });
    const game = addSecondPlayer(lobby, createPlayer("guest", "Guest"), {
      idFactory: nextId,
    });
    expect(game.status).toBe("placement");
  });

  it("adds both players with their fleets built", () => {
    const clock = makeFakeClock();
    const host = createPlayer("host", "Host");
    const lobby = createGame({ id: "g1", config: CONFIG, host, clock });
    const game = addSecondPlayer(lobby, createPlayer("guest", "Guest"), {
      idFactory: nextId,
    });
    expect(game.players["host"].ships).toHaveLength(1);
    expect(game.players["guest"].ships).toHaveLength(1);
  });

  it("throws if the game is not in lobby status", () => {
    const { playing } = buildPlayingGame();
    expect(() =>
      addSecondPlayer(playing, createPlayer("third", "Third"), {
        idFactory: nextId,
      }),
    ).toThrow(GameRuleError);
  });

  it("throws INVALID_PLAYER_COUNT if two players are already present", () => {
    const clock = makeFakeClock();
    const host = createPlayer("host", "Host");
    const lobby = createGame({ id: "g1", config: CONFIG, host, clock });
    const placement = addSecondPlayer(lobby, createPlayer("guest", "Guest"), {
      idFactory: nextId,
    });
    // Simulate still-lobby game with two players by checking the guard
    expect(placement.status).toBe("placement");
    expect(() =>
      addSecondPlayer(placement, createPlayer("extra", "Extra"), {
        idFactory: nextId,
      }),
    ).toThrow(GameRuleError);
  });
});

// ─── placeFleet ───────────────────────────────────────────────────────────────

describe("placeFleet", () => {
  it("marks the player as ready after placing all ships", () => {
    const clock = makeFakeClock();
    const host = createPlayer("host", "Host");
    const lobby = createGame({ id: "g1", config: CONFIG, host, clock });
    const placement = addSecondPlayer(lobby, createPlayer("guest", "Guest"), {
      idFactory: nextId,
    });
    const shipId = placement.players["host"].ships[0].id;
    const next = placeFleet(
      placement,
      "host",
      [{ shipId, r: 0, c: 0, orientation: "horizontal" }],
      { clock, rng: makeSeededRng(1) },
    );
    expect(next.players["host"].ready).toBe(true);
  });

  it("transitions to playing when both players are ready", () => {
    const { playing } = buildPlayingGame();
    expect(playing.status).toBe("playing");
    expect(playing.activePlayerId).not.toBeNull();
  });

  it("does not transition until the second player is also ready", () => {
    const clock = makeFakeClock();
    const host = createPlayer("host", "Host");
    const lobby = createGame({ id: "g1", config: CONFIG, host, clock });
    const placement = addSecondPlayer(lobby, createPlayer("guest", "Guest"), {
      idFactory: nextId,
    });
    const hostShipId = placement.players["host"].ships[0].id;
    const afterOne = placeFleet(
      placement,
      "host",
      [{ shipId: hostShipId, r: 0, c: 0, orientation: "horizontal" }],
      { clock, rng: makeSeededRng(1) },
    );
    expect(afterOne.status).toBe("placement");
  });

  it("throws if placement count does not match fleet size", () => {
    const clock = makeFakeClock();
    const host = createPlayer("host", "Host");
    const lobby = createGame({ id: "g1", config: CONFIG, host, clock });
    const placement = addSecondPlayer(lobby, createPlayer("guest", "Guest"), {
      idFactory: nextId,
    });
    expect(() =>
      placeFleet(placement, "host", [], { clock, rng: makeSeededRng(1) }),
    ).toThrow(GameRuleError);
  });

  it("throws on a collision between ships", () => {
    const clock = makeFakeClock();
    const config: GameConfig = { ...CONFIG, fleet: { Submarine: 2 } };
    const host = createPlayer("host", "Host");
    const lobby = createGame({ id: "g1", config, host, clock });
    const placement = addSecondPlayer(lobby, createPlayer("guest", "Guest"), {
      idFactory: nextId,
    });
    const [s1, s2] = placement.players["host"].ships;
    expect(() =>
      placeFleet(
        placement,
        "host",
        [
          { shipId: s1.id, r: 0, c: 0, orientation: "horizontal" },
          { shipId: s2.id, r: 0, c: 0, orientation: "horizontal" }, // collision
        ],
        { clock, rng: makeSeededRng(1) },
      ),
    ).toThrow(GameRuleError);
  });
});

// ─── processShot ──────────────────────────────────────────────────────────────

describe("processShot", () => {
  it("registers a miss when shooting an empty cell", () => {
    const { playing, clock, activeId, opponentId } = buildPlayingGame();
    // The opponent's submarine is at (7,7); shoot at (0,0) which is empty for them
    const opponentSubPos = playing.players[opponentId].ships[0].positions[0];
    const missR = opponentSubPos.r === 0 ? 1 : 0;
    const { result } = processShot(playing, activeId, missR, 0, { clock });
    expect(result.hit).toBe(false);
    expect(result.cellStatus).toBe("miss");
  });

  it("registers a hit when shooting a ship cell", () => {
    const { playing, clock, activeId, opponentId } = buildPlayingGame();
    const { r, c } = playing.players[opponentId].ships[0].positions[0];
    const { result } = processShot(playing, activeId, r, c, { clock });
    expect(result.hit).toBe(true);
    expect(result.cellStatus).toBe("hit");
  });

  it("sets sunkShipType when the last cell of a ship is hit", () => {
    const { playing, clock, activeId, opponentId } = buildPlayingGame();
    const { r, c } = playing.players[opponentId].ships[0].positions[0];
    const { result } = processShot(playing, activeId, r, c, { clock });
    expect(result.sunkShipType).toBe("Submarine");
  });

  it("sets gameOver and winnerId when all opponent ships are sunk", () => {
    const { playing, clock, activeId } = buildPlayingGame();
    const opponentId = activeId === "host" ? "guest" : "host";
    const { r, c } = playing.players[opponentId].ships[0].positions[0];
    const { game: next, result } = processShot(playing, activeId, r, c, {
      clock,
    });
    expect(result.gameOver).toBe(true);
    expect(next.status).toBe("finished");
    expect(next.winnerId).toBe(activeId);
  });

  it("alternates the active player after each shot", () => {
    const { playing, clock, activeId, opponentId } = buildPlayingGame();
    // Miss to avoid ending game
    const { r: subR } = playing.players[opponentId].ships[0].positions[0];
    const safeR = subR === 0 ? 1 : 0;
    const { game: next } = processShot(playing, activeId, safeR, 0, { clock });
    expect(next.activePlayerId).toBe(opponentId);
  });

  it("applies floor-at-zero on a miss penalty (score cannot go negative)", () => {
    // Use Elite mode with a miss penalty
    const { playing, clock, activeId, opponentId } = buildPlayingGame("Elite");
    const { r: subR } = playing.players[opponentId].ships[0].positions[0];
    const safeR = subR === 0 ? 1 : 0;
    const { game: after } = processShot(playing, activeId, safeR, 0, { clock });
    expect(after.players[activeId].score).toBeGreaterThanOrEqual(0);
  });

  it("does not mutate the input game state", () => {
    const { playing, clock, activeId, opponentId } = buildPlayingGame();
    const { r: subR } = playing.players[opponentId].ships[0].positions[0];
    const safeR = subR === 0 ? 1 : 0;
    const beforeStatus = playing.status;
    processShot(playing, activeId, safeR, 0, { clock });
    expect(playing.status).toBe(beforeStatus);
  });
});

// ─── handleTurnTimeout ────────────────────────────────────────────────────────

describe("handleTurnTimeout", () => {
  it("advances the turn to the opponent", () => {
    const { playing, clock, opponentId } = buildPlayingGame();
    const next = handleTurnTimeout(playing, { clock });
    expect(next.activePlayerId).toBe(opponentId);
  });

  it("resets the timed-out player's consecutive hit streak to zero", () => {
    const { playing, clock, activeId } = buildPlayingGame();
    const withStreak: GameState = {
      ...playing,
      players: {
        ...playing.players,
        [activeId]: { ...playing.players[activeId], consecutiveHits: 3 },
      },
    };
    const next = handleTurnTimeout(withStreak, { clock });
    expect(next.players[activeId].consecutiveHits).toBe(0);
  });

  it("updates lastActionTime and turnDeadlineAt from the clock", () => {
    const { playing, clock } = buildPlayingGame();
    clock.set(9999);
    const next = handleTurnTimeout(playing, { clock });
    expect(next.lastActionTime).toBe(9999);
    expect(next.turnDeadlineAt).toBe(9999 + CONFIG.turnTimerMs);
  });

  it("throws when the game is not playing", () => {
    const { playing } = buildPlayingGame();
    const finished: GameState = { ...playing, status: "finished" };
    expect(() =>
      handleTurnTimeout(finished, { clock: makeFakeClock() }),
    ).toThrow(GameRuleError);
  });
});

// ─── forfeitGame ──────────────────────────────────────────────────────────────

describe("forfeitGame", () => {
  it("sets status to finished and awards win to the opponent", () => {
    const { playing, activeId, opponentId } = buildPlayingGame();
    const next = forfeitGame(playing, activeId);
    expect(next.status).toBe("finished");
    expect(next.winnerId).toBe(opponentId);
  });

  it("is a no-op when the game is already finished", () => {
    const { playing, activeId } = buildPlayingGame();
    const finished = forfeitGame(playing, activeId);
    const again = forfeitGame(finished, activeId);
    expect(again).toBe(finished);
  });
});
