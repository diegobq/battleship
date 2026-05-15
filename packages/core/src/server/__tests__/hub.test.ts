import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeFakeClock } from "../../core/clock";
import { createGame, createPlayer } from "../../core/game";
import { GameState } from "../../core/types";
import { WebSocketHub, __resetHubForTests, getHub } from "../ws/hub";

function mockSocket() {
  return { send: vi.fn(), close: vi.fn(), readyState: 1 };
}

function fakeGame(id = "g1"): GameState {
  return createGame({
    id,
    config: { mode: "Classic", fleet: { Submarine: 1 }, turnTimerMs: 60_000 },
    host: createPlayer("host", "Host"),
    clock: makeFakeClock(0),
  });
}

describe("WebSocketHub", () => {
  let hub: WebSocketHub;

  beforeEach(() => {
    hub = new WebSocketHub();
  });

  describe("register", () => {
    it("adds a connection so isOnline returns true", () => {
      hub.register("g1", "p1", mockSocket());
      expect(hub.isOnline("g1", "p1")).toBe(true);
    });

    it("closes the old socket when the same player reconnects", () => {
      const old = mockSocket();
      hub.register("g1", "p1", old);
      hub.register("g1", "p1", mockSocket());
      expect(old.close).toHaveBeenCalledWith(4000, expect.any(String));
    });

    it("allows two distinct players in the same game", () => {
      hub.register("g1", "p1", mockSocket());
      hub.register("g1", "p2", mockSocket());
      expect(hub.size).toBe(2);
    });
  });

  describe("unregister", () => {
    it("removes the player so isOnline returns false", () => {
      hub.register("g1", "p1", mockSocket());
      hub.unregister("g1", "p1");
      expect(hub.isOnline("g1", "p1")).toBe(false);
    });

    it("prunes the game entry when the last player leaves", () => {
      hub.register("g1", "p1", mockSocket());
      hub.unregister("g1", "p1");
      expect(hub.size).toBe(0);
    });

    it("is a no-op for an unknown game", () => {
      expect(() => hub.unregister("ghost", "ghost")).not.toThrow();
    });
  });

  describe("sendTo", () => {
    it("returns false for an unknown player", () => {
      expect(hub.sendTo("g1", "ghost", { type: "PONG" })).toBe(false);
    });

    it("sends the serialised message and returns true", () => {
      const sock = mockSocket();
      hub.register("g1", "p1", sock);
      expect(hub.sendTo("g1", "p1", { type: "PONG" })).toBe(true);
      expect(sock.send).toHaveBeenCalledOnce();
      expect(JSON.parse(sock.send.mock.calls[0][0])).toMatchObject({
        type: "PONG",
      });
    });

    it("skips delivery and returns false when socket is not OPEN", () => {
      const sock = { ...mockSocket(), readyState: 3 }; // CLOSED
      hub.register("g1", "p1", sock);
      expect(hub.sendTo("g1", "p1", { type: "PONG" })).toBe(false);
      expect(sock.send).not.toHaveBeenCalled();
    });
  });

  describe("broadcast", () => {
    it("delivers to all connected players", () => {
      const s1 = mockSocket();
      const s2 = mockSocket();
      hub.register("g1", "p1", s1);
      hub.register("g1", "p2", s2);
      hub.broadcast("g1", () => ({ type: "PONG" }));
      expect(s1.send).toHaveBeenCalledOnce();
      expect(s2.send).toHaveBeenCalledOnce();
    });

    it("passes each recipient playerId to the factory", () => {
      hub.register("g1", "p1", mockSocket());
      hub.register("g1", "p2", mockSocket());
      const seen: string[] = [];
      hub.broadcast("g1", (pid) => {
        seen.push(pid);
        return { type: "PONG" };
      });
      expect(seen.sort()).toEqual(["p1", "p2"]);
    });

    it("skips sockets with readyState !== OPEN", () => {
      const open = mockSocket();
      const closed = { ...mockSocket(), readyState: 3 };
      hub.register("g1", "p1", open);
      hub.register("g1", "p2", closed);
      hub.broadcast("g1", () => ({ type: "PONG" }));
      expect(open.send).toHaveBeenCalledOnce();
      expect(closed.send).not.toHaveBeenCalled();
    });

    it("is a no-op for an unregistered game", () => {
      expect(() =>
        hub.broadcast("ghost", () => ({ type: "PONG" })),
      ).not.toThrow();
    });
  });

  describe("broadcastState", () => {
    it("sends GAME_STATE_UPDATE to every connected player", () => {
      const s1 = mockSocket();
      const s2 = mockSocket();
      hub.register("g1", "p1", s1);
      hub.register("g1", "p2", s2);
      hub.broadcastState("g1", fakeGame("g1"));
      const msg1 = JSON.parse(s1.send.mock.calls[0][0]);
      const msg2 = JSON.parse(s2.send.mock.calls[0][0]);
      expect(msg1.type).toBe("GAME_STATE_UPDATE");
      expect(msg2.type).toBe("GAME_STATE_UPDATE");
    });
  });

  describe("isOnline", () => {
    it("returns false for players that were never registered", () => {
      expect(hub.isOnline("g1", "nobody")).toBe(false);
    });
  });
});

describe("getHub / __resetHubForTests", () => {
  beforeEach(() => {
    __resetHubForTests();
  });

  it("returns the same singleton on repeated calls", () => {
    expect(getHub()).toBe(getHub());
  });

  it("returns a fresh instance after reset", () => {
    const before = getHub();
    __resetHubForTests();
    expect(getHub()).not.toBe(before);
  });
});
