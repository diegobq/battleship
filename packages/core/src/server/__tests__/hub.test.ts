import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebSocketHub, getHub, __resetHubForTests } from "../ws/hub";
import type { HubSocket } from "../ws/hub";
import type { GameState } from "../../core/types";
import { createGame, createPlayer } from "../../core/game";
import { makeFakeClock } from "../../core/clock";

function makeSock(readyState = 1): HubSocket & { sends: string[] } {
  const sends: string[] = [];
  return {
    sends,
    send: (data) => sends.push(data),
    close: vi.fn(),
    readyState,
  };
}

function makeGame(): GameState {
  const host = createPlayer("host", "Host");
  return createGame({
    id: "g1",
    config: { mode: "Classic", fleet: { Submarine: 1 }, turnTimerMs: 60_000 },
    host,
    clock: makeFakeClock(),
  });
}

describe("WebSocketHub", () => {
  it("sendTo delivers a message to the registered socket", () => {
    const hub = new WebSocketHub();
    const sock = makeSock();
    hub.register("g1", "host", sock);
    hub.sendTo("g1", "host", { type: "PONG" });
    expect(sock.sends).toHaveLength(1);
    expect(JSON.parse(sock.sends[0])).toEqual({ type: "PONG" });
  });

  it("sendTo returns false when the player is not registered", () => {
    const hub = new WebSocketHub();
    expect(hub.sendTo("g1", "nobody", { type: "PONG" })).toBe(false);
  });

  it("sendTo returns false when socket readyState is not OPEN (1)", () => {
    const hub = new WebSocketHub();
    const sock = makeSock(3); // CLOSED
    hub.register("g1", "host", sock);
    expect(hub.sendTo("g1", "host", { type: "PONG" })).toBe(false);
    expect(sock.sends).toHaveLength(0);
  });

  it("register closes an existing socket for the same playerId", () => {
    const hub = new WebSocketHub();
    const first = makeSock();
    const second = makeSock();
    hub.register("g1", "host", first);
    hub.register("g1", "host", second);
    expect(first.close).toHaveBeenCalledWith(4000, "Replaced by new connection.");
  });

  it("unregister removes a player's connection", () => {
    const hub = new WebSocketHub();
    hub.register("g1", "host", makeSock());
    hub.unregister("g1", "host");
    expect(hub.isOnline("g1", "host")).toBe(false);
  });

  it("unregister cleans up the game entry when the last player leaves", () => {
    const hub = new WebSocketHub();
    hub.register("g1", "host", makeSock());
    hub.unregister("g1", "host");
    expect(hub.size).toBe(0);
  });

  it("broadcast calls factory and sends to all open connections", () => {
    const hub = new WebSocketHub();
    const sockA = makeSock();
    const sockB = makeSock();
    hub.register("g1", "a", sockA);
    hub.register("g1", "b", sockB);
    hub.broadcast("g1", () => ({ type: "PONG" }));
    expect(sockA.sends).toHaveLength(1);
    expect(sockB.sends).toHaveLength(1);
  });

  it("broadcast skips closed sockets", () => {
    const hub = new WebSocketHub();
    const open = makeSock(1);
    const closed = makeSock(3);
    hub.register("g1", "a", open);
    hub.register("g1", "b", closed);
    hub.broadcast("g1", () => ({ type: "PONG" }));
    expect(open.sends).toHaveLength(1);
    expect(closed.sends).toHaveLength(0);
  });

  it("broadcastState sends sanitized states to each player", () => {
    const hub = new WebSocketHub();
    const hostSock = makeSock();
    const guestSock = makeSock();
    hub.register("g1", "host", hostSock);
    hub.register("g1", "guest", guestSock);
    const state = makeGame();
    hub.broadcastState("g1", state);
    expect(hostSock.sends).toHaveLength(1);
    expect(guestSock.sends).toHaveLength(1);
    const hostMsg = JSON.parse(hostSock.sends[0]);
    expect(hostMsg.type).toBe("GAME_STATE_UPDATE");
  });

  it("size reflects total registered connections across all games", () => {
    const hub = new WebSocketHub();
    hub.register("g1", "a", makeSock());
    hub.register("g1", "b", makeSock());
    hub.register("g2", "c", makeSock());
    expect(hub.size).toBe(3);
  });
});

describe("getHub singleton", () => {
  beforeEach(() => __resetHubForTests());

  it("returns the same instance on successive calls", () => {
    expect(getHub()).toBe(getHub());
  });

  it("__resetHubForTests forces a fresh instance on next getHub()", () => {
    const first = getHub();
    __resetHubForTests();
    expect(getHub()).not.toBe(first);
  });
});
