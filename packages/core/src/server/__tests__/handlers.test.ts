import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleClientMessage } from "../ws/handlers";
import { WebSocketHub, __resetHubForTests } from "../ws/hub";
import { __resetRegistryForTests, getRegistry } from "../registry";
import { TurnTimer } from "../turn-timer";
import { makeFakeClock } from "../../core/clock";
import { makeSeededRng } from "../../core/rng";
import { createGame, createPlayer, addSecondPlayer, placeFleet } from "../../core/game";
import type { HandlerDeps, HandlerContext } from "../ws/handlers";
import type { HubSocket } from "../ws/hub";
import type { GameState } from "../../core/types";

let shipN = 0;
const nextId = () => `s${++shipN}`;

function makeSock(): HubSocket & { sends: string[]; closed: boolean } {
  const sends: string[] = [];
  return {
    sends,
    closed: false,
    readyState: 1,
    send: (d) => sends.push(d),
    close: vi.fn(),
  };
}

function lastMsg(sock: { sends: string[] }): unknown {
  return JSON.parse(sock.sends[sock.sends.length - 1]);
}

/** Builds a placement-status game (both players added, no fleets placed yet). */
function buildPlacementScenario() {
  const clock = makeFakeClock(1000);
  const rng = makeSeededRng(42);
  const config = { mode: "Classic" as const, fleet: { Submarine: 1 }, turnTimerMs: 1_000 };

  const host = createPlayer("host", "Host");
  const guest = createPlayer("guest", "Guest");

  const lobby = createGame({ id: "g1", config, host, clock });
  const placement = addSecondPlayer(lobby, guest, { idFactory: nextId });

  const reg = getRegistry();
  reg.create(placement);

  const hub = new WebSocketHub();
  const hostSock = makeSock();
  const guestSock = makeSock();
  hub.register("g1", "host", hostSock);
  hub.register("g1", "guest", guestSock);

  const turnTimer = new TurnTimer();
  const deps: HandlerDeps = { registry: reg, hub, turnTimer, clock, rng };

  return { deps, placement, hostSock, guestSock };
}

/** Builds a playing game with one Submarine each, stores it in the registry,
 *  and returns deps + contexts wired up with mock sockets. */
function buildPlayingScenario() {
  const clock = makeFakeClock(1000);
  const rng = makeSeededRng(42);
  const config = { mode: "Classic" as const, fleet: { Submarine: 1 }, turnTimerMs: 1_000 };

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
    { clock, rng: makeSeededRng(42) },
  );
  const playing = placeFleet(
    afterHost,
    "guest",
    [{ shipId: guestShipId, r: 7, c: 7, orientation: "horizontal" }],
    { clock, rng: makeSeededRng(42) },
  );

  const reg = getRegistry();
  reg.create(playing);

  const hub = new WebSocketHub();
  const hostSock = makeSock();
  const guestSock = makeSock();
  hub.register("g1", "host", hostSock);
  hub.register("g1", "guest", guestSock);

  const turnTimer = new TurnTimer();
  const deps: HandlerDeps = { registry: reg, hub, turnTimer, clock, rng };

  const activeId = playing.activePlayerId!;
  const inactiveId = activeId === "host" ? "guest" : "host";
  const activeCtx: HandlerContext = { gameId: "g1", playerId: activeId };
  const inactiveCtx: HandlerContext = { gameId: "g1", playerId: inactiveId };

  return { deps, activeCtx, inactiveCtx, hostSock, guestSock, playing, activeId, inactiveId };
}

describe("handleClientMessage", () => {
  beforeEach(() => {
    __resetRegistryForTests();
    __resetHubForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── PING ────────────────────────────────────────────────────────────────────

  it("PING → sends PONG back to the sender only", () => {
    const { deps, activeCtx, hostSock, guestSock, activeId } = buildPlayingScenario();
    const activeSock = activeId === "host" ? hostSock : guestSock;
    const passiveSock = activeId === "host" ? guestSock : hostSock;
    const before = activeSock.sends.length;
    handleClientMessage(deps, activeCtx, { type: "PING" });
    expect(activeSock.sends.length).toBe(before + 1);
    expect(JSON.parse(activeSock.sends[activeSock.sends.length - 1])).toEqual({ type: "PONG" });
    expect(passiveSock.sends.length).toBe(0);
  });

  // ── SHOOT ───────────────────────────────────────────────────────────────────

  it("SHOOT — hit broadcasts SHOT_RESULT to both players", () => {
    const { deps, activeCtx, hostSock, guestSock, playing, inactiveId } = buildPlayingScenario();
    const { r, c } = playing.players[inactiveId].ships[0].positions[0];
    handleClientMessage(deps, activeCtx, { type: "SHOOT", payload: { r, c } });
    const hostMsg = lastMsg(hostSock);
    const guestMsg = lastMsg(guestSock);
    // Last message after a hit will be GAME_STATE_UPDATE; the one before it is SHOT_RESULT
    const shotMsg = JSON.parse(hostSock.sends[hostSock.sends.length - 2]);
    expect(shotMsg.type).toBe("SHOT_RESULT");
    expect(shotMsg.payload.hit).toBe(true);
  });

  it("SHOOT — miss broadcasts SHOT_RESULT with hit=false", () => {
    const { deps, activeCtx, hostSock, playing, inactiveId } = buildPlayingScenario();
    const subPos = playing.players[inactiveId].ships[0].positions[0];
    const safeR = subPos.r === 0 ? 1 : 0;
    handleClientMessage(deps, activeCtx, { type: "SHOOT", payload: { r: safeR, c: 0 } });
    const shotMsg = JSON.parse(hostSock.sends[hostSock.sends.length - 2]);
    expect(shotMsg.type).toBe("SHOT_RESULT");
    expect(shotMsg.payload.hit).toBe(false);
  });

  it("SHOOT — WRONG_TURN sends ERROR to the shooter only", () => {
    const { deps, inactiveCtx, hostSock, guestSock, inactiveId } = buildPlayingScenario();
    const inactiveSock = inactiveId === "host" ? hostSock : guestSock;
    handleClientMessage(deps, inactiveCtx, { type: "SHOOT", payload: { r: 0, c: 0 } });
    const err = lastMsg(inactiveSock);
    expect((err as any).type).toBe("ERROR");
    expect((err as any).payload.code).toBe("WRONG_TURN");
  });

  it("SHOOT — GAME_NOT_FOUND sends ERROR when game is absent from registry", () => {
    const { deps, hostSock } = buildPlayingScenario();
    const sock = makeSock();
    deps.hub.register("MISSING", "host", sock);
    handleClientMessage(deps, { gameId: "MISSING", playerId: "host" }, { type: "SHOOT", payload: { r: 0, c: 0 } });
    expect((lastMsg(sock) as any).type).toBe("ERROR");
    expect((lastMsg(sock) as any).payload.code).toBe("GAME_NOT_FOUND");
  });

  it("SHOOT — starts the turn timer for the next player after a miss", () => {
    vi.useFakeTimers();
    const { deps, activeCtx, playing, inactiveId } = buildPlayingScenario();
    const subPos = playing.players[inactiveId].ships[0].positions[0];
    const safeR = subPos.r === 0 ? 1 : 0;
    handleClientMessage(deps, activeCtx, { type: "SHOOT", payload: { r: safeR, c: 0 } });
    expect(deps.turnTimer.has("g1")).toBe(true);
  });

  // ── LEAVE_GAME ───────────────────────────────────────────────────────────────

  it("LEAVE_GAME forfeits the game and broadcasts the final state", () => {
    const { deps, activeCtx, hostSock, guestSock, activeId } = buildPlayingScenario();
    handleClientMessage(deps, activeCtx, { type: "LEAVE_GAME" });
    // Both sockets should have received a GAME_STATE_UPDATE with status=finished
    const hostMsg = lastMsg(hostSock) as any;
    const guestMsg = lastMsg(guestSock) as any;
    expect(hostMsg.type).toBe("GAME_STATE_UPDATE");
    expect(hostMsg.payload.state.status).toBe("finished");
  });

  // ── PLACE_FLEET ──────────────────────────────────────────────────────────────

  it("PLACE_FLEET — GAME_NOT_FOUND sends ERROR when game is missing", () => {
    const { deps } = buildPlayingScenario();
    const sock = makeSock();
    deps.hub.register("MISSING", "host", sock);
    handleClientMessage(
      deps,
      { gameId: "MISSING", playerId: "host" },
      { type: "PLACE_FLEET", payload: { placements: [] } },
    );
    expect((lastMsg(sock) as any).type).toBe("ERROR");
  });

  // ── PLACE_FLEET success ──────────────────────────────────────────────────────

  it("PLACE_FLEET — successful placement broadcasts game state", () => {
    const { deps, placement, hostSock, guestSock } = buildPlacementScenario();
    const hostShipId = placement.players["host"].ships[0].id;
    const guestShipId = placement.players["guest"].ships[0].id;
    handleClientMessage(
      deps,
      { gameId: "g1", playerId: "host" },
      { type: "PLACE_FLEET", payload: { placements: [{ shipId: hostShipId, r: 0, c: 0, orientation: "horizontal" }] } },
    );
    // Both players receive the state broadcast after host places fleet
    expect(lastMsg(hostSock)).toBeDefined();
    // Guest places fleet → transitions to playing → starts turn timer
    handleClientMessage(
      deps,
      { gameId: "g1", playerId: "guest" },
      { type: "PLACE_FLEET", payload: { placements: [{ shipId: guestShipId, r: 7, c: 7, orientation: "horizontal" }] } },
    );
    const stateMsg = JSON.parse(guestSock.sends[guestSock.sends.length - 1]) as any;
    expect(stateMsg.type).toBe("GAME_STATE_UPDATE");
    expect(stateMsg.payload.state.status).toBe("playing");
    expect(deps.turnTimer.has("g1")).toBe(true);
  });

  // ── SHOOT — internal error ───────────────────────────────────────────────────

  it("SHOOT — INTERNAL error sends ERROR when processShot throws unexpectedly", () => {
    const { deps, activeCtx, hostSock, guestSock, activeId } = buildPlayingScenario();
    const activeSock = activeId === "host" ? hostSock : guestSock;
    // Corrupt the game state so processShot throws a non-GameRuleError TypeError
    const corrupt = { ...deps.registry.get("g1")! };
    (corrupt as any).players = null;
    const realGet = deps.registry.get.bind(deps.registry);
    let callCount = 0;
    deps.registry.get = (id) => {
      callCount++;
      return callCount === 1 ? corrupt : realGet(id);
    };
    handleClientMessage(deps, activeCtx, { type: "SHOOT", payload: { r: 0, c: 0 } });
    const err = lastMsg(activeSock) as any;
    expect(err.type).toBe("ERROR");
    expect(err.payload.code).toBe("INTERNAL");
  });

  // ── Turn timer elapse ────────────────────────────────────────────────────────

  it("turn timer elapse broadcasts TURN_TIMEOUT and advances the turn", () => {
    vi.useFakeTimers();
    const { deps, activeCtx, hostSock, guestSock, playing, inactiveId } = buildPlayingScenario();
    // Fire a miss to start the turn timer
    const subPos = playing.players[inactiveId].ships[0].positions[0];
    const safeR = subPos.r === 0 ? 1 : 0;
    handleClientMessage(deps, activeCtx, { type: "SHOOT", payload: { r: safeR, c: 0 } });
    const beforeHost = hostSock.sends.length;
    vi.advanceTimersByTime(1_001);
    // After timeout: TURN_TIMEOUT + GAME_STATE_UPDATE should have been sent
    const newMessages = hostSock.sends.slice(beforeHost).map((s) => JSON.parse(s));
    const timeoutMsg = newMessages.find((m) => m.type === "TURN_TIMEOUT");
    expect(timeoutMsg).toBeDefined();
    expect(timeoutMsg?.payload.playerId).toBeDefined();
  });
});
